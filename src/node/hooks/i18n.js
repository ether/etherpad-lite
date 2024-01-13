'use strict';

const languages = require('languages4translatewiki');
const fs = require('fs');
const path = require('path');
const _ = require('underscore');
const pluginDefs = require('../../static/js/pluginfw/plugin_defs.js');
const existsSync = require('../utils/path_exists');
const settings = require('../utils/Settings');

// returns all existing messages merged together and grouped by langcode
// {es: {"foo": "string"}, en:...}
const getAllLocales = () => {
  const locales2paths = {};

  // Puts the paths of all locale files contained in a given directory
  // into `locales2paths` (files from various dirs are grouped by lang code)
  // (only json files with valid language code as name)
  const extractLangs = (dir) => {
    if (!existsSync(dir)) return;
    let stat = fs.lstatSync(dir);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return;

    fs.readdirSync(dir).forEach((file) => {
      file = path.resolve(dir, file);
      stat = fs.lstatSync(file);
      if (stat.isDirectory() || stat.isSymbolicLink()) return;

      const ext = path.extname(file);
      const locale = path.basename(file, ext).toLowerCase();

      if ((ext === '.json') && languages.isValid(locale)) {
        if (!locales2paths[locale]) locales2paths[locale] = [];
        locales2paths[locale].push(file);
      }
    });
  };

  // add core supported languages first
  extractLangs(path.join(settings.root, 'src/locales'));

  // add plugins languages (if any)
  for (const {package: {path: pluginPath}} of Object.values(pluginDefs.plugins)) {
    // plugin locales should overwrite etherpad's core locales
    if (pluginPath.endsWith('/ep_etherpad-lite') === true) continue;
    extractLangs(path.join(pluginPath, 'locales'));
  }

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
        const locale = locales[langcode];

        // Handles the error if an unknown language code is entered
        if (locale === undefined) {
          const possibleMatches = [];
          let strippedLangcode = '';
          if (langcode.includes('-')) {
            strippedLangcode = langcode.split('-')[0];
          }
          for (const localeInEtherPad of Object.keys(locales)) {
            if (localeInEtherPad.includes(strippedLangcode)) {
              possibleMatches.push(localeInEtherPad);
            }
          }
          throw new Error(`Language code ${langcode} is unknown. ` +
              `Maybe you meant: ${possibleMatches}`);
        }

        locales[langcode][key] = localeString;
      });
    });
  }

  return locales;
};

// returns a hash of all available languages availables with nativeName and direction
// e.g. { es: {nativeName: "español", direction: "ltr"}, ... }
const getAvailableLangs = (locales) => {
  const result = {};
  for (const langcode of Object.keys(locales)) {
    result[langcode] = languages.getLanguageInfo(langcode);
  }
  return result;
};

// returns locale index that will be served in /locales.json
const generateLocaleIndex = (locales) => {
  const result = _.clone(locales); // keep English strings
  for (const langcode of Object.keys(locales)) {
    if (langcode !== 'en') result[langcode] = `locales/${langcode}.json`;
  }
  return JSON.stringify(result);
};


exports.expressPreSession = async (hookName, {app}) => {
  // regenerate locales on server restart
  const locales = getAllLocales();
  const localeIndex = generateLocaleIndex(locales);
  exports.availableLangs = getAvailableLangs(locales);

  app.get('/locales/:locale', (req, res) => {
    // works with /locale/en and /locale/en.json requests
    const locale = req.params.locale.split('.')[0];
    if (Object.prototype.hasOwnProperty.call(exports.availableLangs, locale)) {
      res.setHeader('Cache-Control', `public, max-age=${settings.maxAge}`);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(`{"${locale}":${JSON.stringify(locales[locale])}}`);
    } else {
      res.status(404).send('Language not available');
    }
  });

  app.get('/locales.json', (req, res) => {
    res.setHeader('Cache-Control', `public, max-age=${settings.maxAge}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(localeIndex);
  });
};
