"use strict";

var request = require("request");
var deferred = require("deferred");
var jsdom = require("jsdom");
var fs = require("fs");
var _ = require("underscore");
var prompt = require('prompt');

var scrapeGerman = function() {
  var mappings = [];
  var d = deferred();

  jsdom.env({
    url: "https://de.wikipedia.org/wiki/ISO-3166-1-Kodierliste",
    scripts: ["http://code.jquery.com/jquery.js"],
    done: function(error, window) {
      var $ = window.$;
      $("table.wikitable > tbody").find("tr").each(function (idx, elem) {
        var tds = $(elem).find("td");
        if (tds && tds.length > 0) {
          var countryLink = $(tds[0]).find("a[href^='/wiki']");
          if (countryLink && countryLink.length == 1) {
            var name = $(countryLink).text().trim();
            $(tds[1]).children().remove();
            var code = $(tds[1]).text();
            if (code.indexOf("(") == -1) {
              mappings.push({code: code, name: name});
            } else {
              var primaryCode = code.split("(")[0].replace(" ", "");
              var secondaryCode = code.split("(")[1].replace("und", "").replace(" ", "").replace(")", "");
              mappings.push({code: primaryCode, name: name});
              mappings.push({code: secondaryCode, name: name});
            }
          }
        }
      });

      d.resolve(mappings);
    }
  });

  return d.promise;
};

var scrapeFrench = function() {
  var mappings = [];
  var d = deferred();

  jsdom.env({
    url: "https://fr.wikipedia.org/wiki/ISO_3166-1",
    scripts: ["http://code.jquery.com/jquery.js"],
    done: function(error, window) {
      var $ = window.$;
      $($("table.wikitable")[1]).find("tbody").find("tr").each(function (idx, elem) {
        var tds = $(elem).find("td");
        if (tds && tds.length > 0) {
          var code = $(tds[2]).text();
          var name = $(tds[4]).text().replace(" (pays)", "").trim();
          mappings.push({code: code, name: name});
        }
      });

      d.resolve(mappings);
    }
  });

  return d.promise;
};

scrapeGerman().then(function(germanMappings) {
  scrapeFrench().then(function(frenchMappings) {
    var flags = fs.readdirSync("img/flags");
    var l10n_de = {};
    var l10n_fr = {};
    for (var i = 0; i < flags.length; i++) {
      var code = flags[i].replace(".png", "");
      var de = false;
      for (var g = 0; g < germanMappings.length; g++) {
        if (germanMappings[g].code.toLowerCase() == code) {
          de = true;
          l10n_de[code] = germanMappings[g].name;
        }
      }
      var fr = false;
      for (var f = 0; f < frenchMappings.length; f++) {
        if (frenchMappings[f].code.toLowerCase() == code) {
          fr = true;
          l10n_fr[code] = frenchMappings[f].name;
        }
      }
      if (!de) {
        console.log("WARN: No german translation for code " + code + " found!");
      }
      if (!fr) {
        console.log("WARN: No french translation for code " + code + " found!");
      }
    }
    fs.writeFileSync("labels_de.json", JSON.stringify(l10n_de));
    fs.writeFileSync("labels_fr.json", JSON.stringify(l10n_fr));
  });
});