'use strict';

import languages from 'languages4translatewiki';
import fs from 'fs';
import path from 'path';
import _ from 'underscore';
import {plugins} from '../../static/js/pluginfw/plugin_defs.js';
import {check} from '../utils/path_exists';
import {customLocaleStrings, maxAge, root} from '../utils/Settings';
import {Presession} from "../models/Presession";

// returns all existing messages merged together and grouped by langcode
// {es: {"foo": "string"}, en:...}
const getAllLocales = () => {
  const locales2paths = {};

  // Puts the paths of all locale files contained in a given directory
  // into `locales2paths` (files from various dirs are grouped by lang code)
  // (only json files with valid language code as name)
  const extractLangs = (dir) => {
    if (!check(dir)) return;
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
  extractLangs(path.join(root, 'src/locales'));

  // add plugins languages (if any)
  for (const val of Object.values(plugins)) {
    const pluginPath:Presession = val as Presession
    // plugin locales should overwrite etherpad's core locales
    if (pluginPath.package.path.endsWith('/ep_etherpad-lite') === true) continue;
    extractLangs(path.join(pluginPath.package.path, 'locales'));
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
  if (customLocaleStrings) {
    if (typeof customLocaleStrings !== 'object') throw wrongFormatErr;
    _.each(customLocaleStrings, (overrides, langcode) => {
      if (typeof overrides !== 'object') throw wrongFormatErr;
      _.each(overrides, (localeString, key) => {
        if (typeof localeString !== 'string') throw wrongFormatErr;
        locales[langcode][key] = localeString;
      });
    });
  }

  return locales;
};

// returns a hash of all available languages availables with nativeName and direction
// e.g. { es: {nativeName: "español", direction: "ltr"}, ... }
export const getAvailableLangs = (locales) => {
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


export const expressPreSession = async (hookName, {app}) => {
  // regenerate locales on server restart
  const locales = getAllLocales();
  const localeIndex = generateLocaleIndex(locales);
  let availableLangs = getAvailableLangs(locales);

  app.get('/locales/:locale', (req, res) => {
    // works with /locale/en and /locale/en.json requests
    const locale = req.params.locale.split('.')[0];
    if (Object.prototype.hasOwnProperty.call(availableLangs, locale)) {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(`{"${locale}":${JSON.stringify(locales[locale])}}`);
    } else {
      res.status(404).send('Language not available');
    }
  });

  app.get('/locales.json', (req, res) => {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(localeIndex);
  });
};
