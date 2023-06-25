'use strict';

import log4js from 'log4js';
import {prefix, update} from "./plugins";

import {aCallAll} from "./hooks";

import request from "request";

import exportCMD from "../../../node/utils/run_cmd";

import {reloadSettings} from "../../../node/utils/Settings";
import {InstallerModel} from "../../module/InstallerModel";

const logger = log4js.getLogger('plugins');

const onAllTasksFinished = async () => {
  const settings = reloadSettings();
  await aCallAll('loadSettings', {settings});
  await aCallAll('restartServer');
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

export const uninstall = async (pluginName, cb = null) => {
  cb = wrapTaskCb(cb);
  logger.info(`Uninstalling plugin ${pluginName}...`);
  try {
    // The --no-save flag prevents npm from creating package.json or package-lock.json.
    // The --legacy-peer-deps flag is required to work around a bug in npm v7:
    // https://github.com/npm/cli/issues/2199
    await exportCMD(['npm', 'uninstall', '--no-save', '--legacy-peer-deps', pluginName]);
  } catch (err) {
    logger.error(`Failed to uninstall plugin ${pluginName}`);
    cb(err || new Error(err));
    throw err;
  }
  logger.info(`Successfully uninstalled plugin ${pluginName}`);
  await aCallAll('pluginUninstall', {pluginName});
  await update();
  cb(null);
};

export const install = async (pluginName, cb = null) => {
  cb = wrapTaskCb(cb);
  logger.info(`Installing plugin ${pluginName}...`);
  try {
    // The --no-save flag prevents npm from creating package.json or package-lock.json.
    // The --legacy-peer-deps flag is required to work around a bug in npm v7:
    // https://github.com/npm/cli/issues/2199
    await exportCMD(['npm', 'install', '--no-save', '--legacy-peer-deps', pluginName]);
  } catch (err) {
    logger.error(`Failed to install plugin ${pluginName}`);
    cb(err || new Error(err));
    throw err;
  }
  logger.info(`Successfully installed plugin ${pluginName}`);
  await aCallAll('pluginInstall', {pluginName});
  await update();
  cb(null);
};

export let availablePlugins = null;
let cacheTimestamp = 0;

export const getAvailablePlugins = (maxCacheAge) => {
  const nowTimestamp = Math.round(Date.now() / 1000);

  return new Promise((resolve, reject) => {
    // check cache age before making any request
    if (availablePlugins && maxCacheAge && (nowTimestamp - cacheTimestamp) <= maxCacheAge) {
      return resolve(availablePlugins);
    }

    request('https://static.etherpad.org/plugins.json', (er, response, plugins) => {
      if (er) return reject(er);

      try {
        plugins = JSON.parse(plugins);
      } catch (err) {
        logger.error(`error parsing plugins.json: ${err.stack || err}`);
        plugins = [];
      }

      availablePlugins = plugins;
      cacheTimestamp = nowTimestamp;
      resolve(plugins);
    });
  });
};


export const search = (searchTerm, maxCacheAge) => getAvailablePlugins(maxCacheAge).then(
    (results: InstallerModel[]) => {
      const res = {};

      if (searchTerm) {
        searchTerm = searchTerm.toLowerCase();
      }


      for (const pluginName in results) {
        // for every available plugin
        // TODO: Also search in keywords here!
        if (pluginName.indexOf(prefix) !== 0) continue;

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
