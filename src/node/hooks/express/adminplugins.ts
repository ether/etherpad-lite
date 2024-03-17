'use strict';

import {ArgsExpressType} from "../../types/ArgsExpressType";
import {ErrorCaused} from "../../types/ErrorCaused";
import {QueryType} from "../../types/QueryType";

import {getAvailablePlugins, install, search, uninstall} from "../../../static/js/pluginfw/installer";
import {PackageData} from "../../types/PackageInfo";

const pluginDefs = require('../../../static/js/pluginfw/plugin_defs');
import semver from 'semver';


exports.socketio = (hookName:string, args:ArgsExpressType, cb:Function) => {
  const io = args.io.of('/pluginfw/installer');
  io.on('connection', (socket:any) => {
    // @ts-ignore
    const {session: {user: {is_admin: isAdmin} = {}} = {}} = socket.conn.request;
    if (!isAdmin) return;

    socket.on('getInstalled', (query:string) => {
      // send currently installed plugins
      const installed =
          Object.keys(pluginDefs.plugins).map((plugin) => pluginDefs.plugins[plugin].package);

      socket.emit('results:installed', {installed});
    });

    socket.on('checkUpdates', async () => {
      // Check plugins for updates
      try {
        const results = await getAvailablePlugins(/* maxCacheAge:*/ 60 * 10);

        const updatable = Object.keys(pluginDefs.plugins).filter((plugin) => {
          if (!results[plugin]) return false;

          const latestVersion = results[plugin].version;
          const currentVersion = pluginDefs.plugins[plugin].package.version;

          return semver.gt(latestVersion, currentVersion);
        });

        socket.emit('results:updatable', {updatable});
      } catch (err) {
        const errc = err as ErrorCaused
        console.warn(errc.stack || errc.toString());

        socket.emit('results:updatable', {updatable: {}});
      }
    });

    socket.on('getAvailable', async (query:string) => {
      try {
        const results = await getAvailablePlugins(/* maxCacheAge:*/ false);
        socket.emit('results:available', results);
      } catch (er) {
        console.error(er);
        socket.emit('results:available', {});
      }
    });

    socket.on('search', async (query: QueryType) => {
      try {
        const results = await search(query.searchTerm, /* maxCacheAge:*/ 60 * 10);
        let res = Object.keys(results)
            .map((pluginName) => results[pluginName])
            .filter((plugin) => !pluginDefs.plugins[plugin.name]);
        res = sortPluginList(res, query.sortBy, query.sortDir)
            .slice(query.offset, query.offset + query.limit);
        socket.emit('results:search', {results: res, query});
      } catch (er) {
        console.error(er);

        socket.emit('results:search', {results: {}, query});
      }
    });

    socket.on('install', (pluginName: string) => {
      install(pluginName, (err: ErrorCaused) => {
        if (err) console.warn(err.stack || err.toString());

        socket.emit('finished:install', {
          plugin: pluginName,
          code: err ? err.code : null,
          error: err ? err.message : null,
        });
      });
    });

    socket.on('uninstall', (pluginName:string) => {
      uninstall(pluginName, (err:ErrorCaused) => {
        if (err) console.warn(err.stack || err.toString());

        socket.emit('finished:uninstall', {plugin: pluginName, error: err ? err.message : null});
      });
    });
  });
  return cb();
};

/**
 * Sorts  a list of plugins by a property
 * @param {Object} plugins The plugins to sort
 * @param {Object} property The property to sort by
 * @param  {String} dir The directory of the plugin
 * @return {Object[]}
 */
const sortPluginList = (plugins:PackageData[], property:string, /* ASC?*/dir:string): PackageData[] => plugins.sort((a, b) => {
  // @ts-ignore
  if (a[property] < b[property]) {
    return dir ? -1 : 1;
  }

  // @ts-ignore
  if (a[property] > b[property]) {
    return dir ? 1 : -1;
  }

  // a must be equal to b
  return 0;
});
