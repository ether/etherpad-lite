var languages = require('languages4translatewiki')
  , fs = require('fs')
  , path = require('path')
  , _ = require('underscore')
  , npm = require('npm')
  , plugins = require('ep_etherpad-lite/static/js/pluginfw/plugins.js').plugins
  , semver = require('semver')
  , existsSync = require('../utils/path_exists')
  , settings = require('../utils/Settings')
;


// returns all existing messages merged together and grouped by langcode
// {es: {"foo": "string"}, en:...}
function getAllLocales() {
  var locales2paths = {};

  // Puts the paths of all locale files contained in a given directory
  // into `locales2paths` (files from various dirs are grouped by lang code)
  // (only json files with valid language code as name)
  function extractLangs(dir) {
    if(!existsSync(dir)) return;
    var stat = fs.lstatSync(dir);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return;

    fs.readdirSync(dir).forEach(function(file) {
      file = path.resolve(dir, file);
      stat = fs.lstatSync(file);
      if (stat.isDirectory() || stat.isSymbolicLink()) return;

      var ext = path.extname(file)
      , locale = path.basename(file, ext).toLowerCase();

      if ((ext == '.json') && languages.isValid(locale)) {
        if(!locales2paths[locale]) locales2paths[locale] = [];
        locales2paths[locale].push(file);
      }
    });
  }

  //add core supported languages first
  extractLangs(npm.root+"/ep_etherpad-lite/locales");

  //add plugins languages (if any)
  for(var pluginName in plugins) extractLangs(path.join(npm.root, pluginName, 'locales'));

  // Build a locale index (merge all locale data other than user-supplied overrides)
  var locales = {}
  _.each (locales2paths, function(files, langcode) {
    locales[langcode]={};

    files.forEach(function(file) {
     var fileContents = JSON.parse(fs.readFileSync(file,'utf8'));
      _.extend(locales[langcode], fileContents);
    });
  });

  // Add custom strings from settings.json
  // Since this is user-supplied, we'll do some extra sanity checks
  const wrongFormatErr = Error(
    "customLocaleStrings in wrong format. See documentation " +
    "for Customization for Administrators, under Localization.")
  if (settings.customLocaleStrings) {
    if (typeof settings.customLocaleStrings !== "object") throw wrongFormatErr
    _.each(settings.customLocaleStrings, function(overrides, langcode) {
      if (typeof overrides !== "object") throw wrongFormatErr
      _.each(overrides, function(localeString, key) {
        if (typeof localeString !== "string") throw wrongFormatErr
        locales[langcode][key] = localeString
      })
    })
  }

  return locales;
}

// returns a hash of all available languages availables with nativeName and direction
// e.g. { es: {nativeName: "español", direction: "ltr"}, ... }
function getAvailableLangs(locales) {
  var priority = {};
  var nonPriority = {};
  var sortedNonPriority = {};

  // Set priority Languages (Worlds top 10) most used according to the Internet...
  var priorityLanguages = ["en-gb", "de", "es", "zh-hans", "hi", "ar", "ms", "ru", "bn"];

  // I hate that we iterate this twice but I can't think of a better way :(
  // Push priority languages first
  _.each(_.keys(locales), function(langcode) {
    if(priorityLanguages.includes(langcode)){
      priority[langcode] = languages.getLanguageInfo(langcode);
    }
  });

  // Other languages..
  _.each(_.keys(locales), function(langcode) {
    if(!priorityLanguages.includes(langcode)){
      nonPriority[langcode] = languages.getLanguageInfo(langcode);
    }
  });

  // Sort by keys, not ideal because Traditional Chinese for example has a key of "zt..."
  Object.keys(nonPriority).sort().forEach(function(v, i) {
    sortedNonPriority[v] = nonPriority[v];
  });

  // Merge the two objects putting Top 10 languages at the top of the select
  var merged = {...priority,...sortedNonPriority};
  return merged;
}

// returns locale index that will be served in /locales.json
var generateLocaleIndex = function (locales) {
  var result = _.clone(locales) // keep English strings
  _.each(_.keys(locales), function(langcode) {
    if (langcode != 'en') result[langcode]='locales/'+langcode+'.json';
  });
  return JSON.stringify(result);
}


exports.expressCreateServer = function(n, args) {

  //regenerate locales on server restart
  var locales = getAllLocales();
  var localeIndex = generateLocaleIndex(locales);
  exports.availableLangs = getAvailableLangs(locales);

  args.app.get ('/locales/:locale', function(req, res) {
    //works with /locale/en and /locale/en.json requests
    var locale = req.params.locale.split('.')[0];
    if (exports.availableLangs.hasOwnProperty(locale)) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send('{"'+locale+'":'+JSON.stringify(locales[locale])+'}');
    } else {
      res.status(404).send('Language not available');
    }
  })

  args.app.get('/locales.json', function(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(localeIndex);
  })

}

