'use strict';

const log4js = require('log4js');
const plugins = require('./plugins');
const hooks = require('./hooks');
const runCmd = require('../../../node/utils/run_cmd');
const settings = require('../../../node/utils/Settings');
const axios = require('axios');
const {PluginManager} = require('live-plugin-manager-pnpm');
const {promises: fs} = require('fs');
const path = require('path');
const {findEtherpadRoot} = require('../../../node/utils/AbsolutePaths');
const logger = log4js.getLogger('plugins');

exports.manager = new PluginManager();

exports.installedPluginsPath = path.join(settings.root, 'var/installed_plugins.json');

const onAllTasksFinished = async () => {
  await plugins.update();
  await persistInstalledPlugins();
  settings.reloadSettings();
  await hooks.aCallAll('loadSettings', {settings});
  await hooks.aCallAll('restartServer');
};

const headers = {
  'User-Agent': `Etherpad/${settings.getEpVersion()}`,
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

const migratePluginsFromNodeModules = async () => {
  logger.info('start migration of plugins in node_modules');
  // Notes:
  //   * Do not pass `--prod` otherwise `npm ls` will fail if there is no `package.json`.
  //   * The `--no-production` flag is required (or the `NODE_ENV` environment variable must be
  //     unset or set to `development`) because otherwise `npm ls` will not mention any packages
  //     that are not included in `package.json` (which is expected to not exist).
  const cmd = ['pnpm', 'ls', '--long', '--json', '--depth=0', '--no-production'];
  const [{dependencies = {}}] = JSON.parse(await runCmd(cmd,
      {stdio: [null, 'string']}));
  await Promise.all(Object.entries(dependencies)
      .filter(([pkg, info]) => pkg.startsWith(plugins.prefix) && pkg !== 'ep_etherpad-lite')
      .map(async ([pkg, info]) => {
        if (!info.resolved) {
          // Install from node_modules directory
          await exports.manager.installFromPath(`${findEtherpadRoot()}/node_modules/${pkg}`);
        } else {
          await exports.manager.install(pkg);
        }
      }));
  await persistInstalledPlugins();
};

exports.checkForMigration = async () => {
  logger.info('check installed plugins for migration');

  try {
    await fs.access(exports.installedPluginsPath, fs.constants.F_OK);
  } catch (err) {
    await migratePluginsFromNodeModules();
  }

  const fileContent = await fs.readFile(exports.installedPluginsPath);
  const installedPlugins = JSON.parse(fileContent.toString());

  for (const plugin of installedPlugins.plugins) {
    if (plugin.name.startsWith(plugins.prefix) && plugin.name !== 'ep_etherpad-lite') {
      await exports.manager.install(plugin.name, plugin.version);
    }
  }
};

const persistInstalledPlugins = async () => {
  const installedPlugins = {plugins: []};
  for (const pkg of Object.values(await plugins.getPackages())) {
    installedPlugins.plugins.push({
      name: pkg.name,
      version: pkg.version,
    });
  }
  installedPlugins.plugins = [...new Set(installedPlugins.plugins)];
  await fs.writeFile(exports.installedPluginsPath, JSON.stringify(installedPlugins));
};

exports.uninstall = async (pluginName, cb = null) => {
  cb = wrapTaskCb(cb);
  logger.info(`Uninstalling plugin ${pluginName}...`);
  await exports.manager.uninstall(pluginName);
  logger.info(`Successfully uninstalled plugin ${pluginName}`);
  await hooks.aCallAll('pluginUninstall', {pluginName});
  cb(null);
};

exports.install = async (pluginName, cb = null) => {
  cb = wrapTaskCb(cb);
  logger.info(`Installing plugin ${pluginName}...`);
  await exports.manager.install(pluginName);
  logger.info(`Successfully installed plugin ${pluginName}`);
  await hooks.aCallAll('pluginInstall', {pluginName});
  cb(null);
};

exports.availablePlugins = null;
let cacheTimestamp = 0;

exports.getAvailablePlugins = (maxCacheAge) => {
  const nowTimestamp = Math.round(Date.now() / 1000);

  return new Promise(async (resolve, reject) => {
    // check cache age before making any request
    if (exports.availablePlugins && maxCacheAge && (nowTimestamp - cacheTimestamp) <= maxCacheAge) {
      return resolve(exports.availablePlugins);
    }

    await axios.get('https://static.etherpad.org/plugins.json', {headers})
        .then((pluginsLoaded) => {
          exports.availablePlugins = pluginsLoaded.data;
          cacheTimestamp = nowTimestamp;
          resolve(exports.availablePlugins);
        })
        .catch(async (err) => reject(err));
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
