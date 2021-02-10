'use strict';

const log4js = require('log4js');
const plugins = require('./plugins');
const hooks = require('./hooks');
const npm = require('npm');
const request = require('request');
const util = require('util');

const logger = log4js.getLogger('plugins');

let npmIsLoaded = false;
const loadNpm = async () => {
  if (npmIsLoaded) return;
  await util.promisify(npm.load)({});
  npmIsLoaded = true;
  npm.on('log', log4js.getLogger('npm').log);
};

const onAllTasksFinished = () => {
  hooks.aCallAll('restartServer', {}, () => {});
};

let tasks = 0;

const wrapTaskCb = (cb) => {
  tasks++;

  return (...args) => {
    cb && cb(...args);
    tasks--;
    if (tasks === 0) onAllTasksFinished();
  };
};

exports.uninstall = async (pluginName, cb = null) => {
  cb = wrapTaskCb(cb);
  logger.info(`Uninstalling plugin ${pluginName}...`);
  try {
    await loadNpm();
    await util.promisify(npm.commands.uninstall)([pluginName]);
  } catch (err) {
    logger.error(`Failed to uninstall plugin ${pluginName}`);
    cb(err || new Error(err));
    throw err;
  }
  logger.info(`Successfully uninstalled plugin ${pluginName}`);
  await hooks.aCallAll('pluginUninstall', {pluginName});
  await plugins.update();
  cb(null);
};

exports.install = async (pluginName, cb = null) => {
  cb = wrapTaskCb(cb);
  logger.info(`Installing plugin ${pluginName}...`);
  try {
    await loadNpm();
    await util.promisify(npm.commands.install)([`${pluginName}@latest`]);
  } catch (err) {
    logger.error(`Failed to install plugin ${pluginName}`);
    cb(err || new Error(err));
    throw err;
  }
  logger.info(`Successfully installed plugin ${pluginName}`);
  await hooks.aCallAll('pluginInstall', {pluginName});
  await plugins.update();
  cb(null);
};

exports.availablePlugins = null;
let cacheTimestamp = 0;

exports.getAvailablePlugins = (maxCacheAge) => {
  const nowTimestamp = Math.round(Date.now() / 1000);

  return new Promise((resolve, reject) => {
    // check cache age before making any request
    if (exports.availablePlugins && maxCacheAge && (nowTimestamp - cacheTimestamp) <= maxCacheAge) {
      return resolve(exports.availablePlugins);
    }

    request('https://static.etherpad.org/plugins.json', (er, response, plugins) => {
      if (er) return reject(er);

      try {
        plugins = JSON.parse(plugins);
      } catch (err) {
        logger.error(`error parsing plugins.json: ${err.stack || err}`);
        plugins = [];
      }

      exports.availablePlugins = plugins;
      cacheTimestamp = nowTimestamp;
      resolve(plugins);
    });
  });
};


exports.search = (searchTerm, maxCacheAge) => exports.getAvailablePlugins(maxCacheAge).then(
    (results) => {
      const res = {};

      if (searchTerm) {
        searchTerm = searchTerm.toLowerCase();
      }

      for (const pluginName in results) {
        // for every available plugin
        // TODO: Also search in keywords here!
        if (pluginName.indexOf(plugins.prefix) !== 0) continue;

        if (searchTerm && !~results[pluginName].name.toLowerCase().indexOf(searchTerm) &&
           (typeof results[pluginName].description !== 'undefined' &&
              !~results[pluginName].description.toLowerCase().indexOf(searchTerm))
        ) {
          if (typeof results[pluginName].description === 'undefined') {
            logger.debug(`plugin without Description: ${results[pluginName].name}`);
          }

          continue;
        }

        res[pluginName] = results[pluginName];
      }

      return res;
    }
);
