const languages = require('languages4translatewiki');
const fs = require('fs');
const path = require('path');
const _ = require('underscore');
const npm = require('npm');
const plugins = require('ep_etherpad-lite/static/js/pluginfw/plugin_defs.js').plugins;
const semver = require('semver');
const existsSync = require('../utils/path_exists');
const settings = require('../utils/Settings')
;


// returns all existing messages merged together and grouped by langcode
// {es: {"foo": "string"}, en:...}
function getAllLocales() {
  const locales2paths = {};

  // Puts the paths of all locale files contained in a given directory
  // into `locales2paths` (files from various dirs are grouped by lang code)
  // (only json files with valid language code as name)
  function extractLangs(dir) {
    if (!existsSync(dir)) return;
    let stat = fs.lstatSync(dir);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return;

    fs.readdirSync(dir).forEach((file) => {
      file = path.resolve(dir, file);
      stat = fs.lstatSync(file);
      if (stat.isDirectory() || stat.isSymbolicLink()) return;

      const ext = path.extname(file);
      const locale = path.basename(file, ext).toLowerCase();

      if ((ext == '.json') && languages.isValid(locale)) {
        if (!locales2paths[locale]) locales2paths[locale] = [];
        locales2paths[locale].push(file);
      }
    });
  }

  // add core supported languages first
  extractLangs(`${npm.root}/ep_etherpad-lite/locales`);

  // add plugins languages (if any)
  for (const pluginName in plugins) extractLangs(path.join(npm.root, pluginName, 'locales'));

  // Build a locale index (merge all locale data other than user-supplied overrides)
  const locales = {};
  _.each(locales2paths, (files, langcode) => {
    locales[langcode] = {};

    files.forEach((file) => {
      let fileContents;
      try {
        fileContents = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (err) {
        console.error(`failed to read JSON file ${file}: ${err}`);
        throw err;
      }
      _.extend(locales[langcode], fileContents);
    });
  });

  // Add custom strings from settings.json
  // Since this is user-supplied, we'll do some extra sanity checks
  const wrongFormatErr = Error(
      'customLocaleStrings in wrong format. See documentation ' +
    'for Customization for Administrators, under Localization.');
  if (settings.customLocaleStrings) {
    if (typeof settings.customLocaleStrings !== 'object') throw wrongFormatErr;
    _.each(settings.customLocaleStrings, (overrides, langcode) => {
      if (typeof overrides !== 'object') throw wrongFormatErr;
      _.each(overrides, (localeString, key) => {
        if (typeof localeString !== 'string') throw wrongFormatErr;
        locales[langcode][key] = localeString;
      });
    });
  }

  return locales;
}

// returns a hash of all available languages availables with nativeName and direction
// e.g. { es: {nativeName: "español", direction: "ltr"}, ... }
function getAvailableLangs(locales) {
  const result = {};
  _.each(_.keys(locales), (langcode) => {
    result[langcode] = languages.getLanguageInfo(langcode);
  });
  return result;
}

// returns locale index that will be served in /locales.json
const generateLocaleIndex = function (locales) {
  const result = _.clone(locales); // keep English strings
  _.each(_.keys(locales), (langcode) => {
    if (langcode != 'en') result[langcode] = `locales/${langcode}.json`;
  });
  return JSON.stringify(result);
};


exports.expressCreateServer = function (n, args, cb) {
  // regenerate locales on server restart
  const locales = getAllLocales();
  const localeIndex = generateLocaleIndex(locales);
  exports.availableLangs = getAvailableLangs(locales);

  args.app.get('/locales/:locale', (req, res) => {
    // works with /locale/en and /locale/en.json requests
    const locale = req.params.locale.split('.')[0];
    if (exports.availableLangs.hasOwnProperty(locale)) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(`{"${locale}":${JSON.stringify(locales[locale])}}`);
    } else {
      res.status(404).send('Language not available');
    }
  });

  args.app.get('/locales.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(localeIndex);
  });

  return cb();
};
