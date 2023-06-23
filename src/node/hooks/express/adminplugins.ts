'use strict';

import {required} from '../../eejs';
import {getEpVersion, getGitCommit} from "../../utils/Settings";

import {getAvailablePlugins, install, search, uninstall} from "../../../static/js/pluginfw/installer";

import {plugins} from "../../../static/js/pluginfw/plugin_defs";

import {formatHooks, formatParts, formatPlugins} from "../../../static/js/pluginfw/plugins";

import semver from "semver";

import UpdateCheck from "../../utils/UpdateCheck";

export const expressCreateServer = (hookName, args, cb) => {
  args.app.get('/admin/plugins', (req, res) => {
    res.send(required('ep_etherpad-lite/templates/admin/plugins.html', {
      plugins: plugins,
      req,
      errors: [],
    }));
  });

  args.app.get('/admin/plugins/info', (req, res) => {
    const gitCommit = getGitCommit();
    const epVersion = getEpVersion();

    res.send(required('ep_etherpad-lite/templates/admin/plugins-info.html', {
      gitCommit,
      epVersion,
      installedPlugins: `<pre>${formatPlugins().replace(/, /g, '\n')}</pre>`,
      installedParts: `<pre>${formatParts()}</pre>`,
      installedServerHooks: `<div>${formatHooks('hooks', true)}</div>`,
      installedClientHooks: `<div>${formatHooks('client_hooks', true)}</div>`,
      latestVersion: UpdateCheck.getLatestVersion(),
      req,
    }));
  });

  return cb();
};

export const socketio = (hookName, args, cb) => {
  const io = args.io.of('/pluginfw/installer');
  io.on('connection', (socket) => {
    const {session: {user: {is_admin: isAdmin} = {}} = {}}:SessionSocketModel = socket.conn.request;
    if (!isAdmin) return;

    socket.on('getInstalled', (query) => {
      // send currently installed plugins
      const installed =
          Object.keys(plugins).map((plugin) => plugins[plugin].package);

      socket.emit('results:installed', {installed});
    });

    socket.on('checkUpdates', async () => {
      // Check plugins for updates
      try {
        const results = await getAvailablePlugins(/* maxCacheAge:*/ 60 * 10);

        const updatable = Object.keys(plugins).filter((plugin) => {
          if (!results[plugin]) return false;

          const latestVersion = results[plugin].version;
          const currentVersion = plugins[plugin].package.version;

          return semver.gt(latestVersion, currentVersion);
        });

        socket.emit('results:updatable', {updatable});
      } catch (err) {
        console.warn(err.stack || err.toString());

        socket.emit('results:updatable', {updatable: {}});
      }
    });

    socket.on('getAvailable', async (query) => {
      try {
        const results = await getAvailablePlugins(/* maxCacheAge:*/ false);
        socket.emit('results:available', results);
      } catch (er) {
        console.error(er);
        socket.emit('results:available', {});
      }
    });

    socket.on('search', async (query) => {
      try {
        const results = await search(query.searchTerm, /* maxCacheAge:*/ 60 * 10);
        let res = Object.keys(results)
            .map((pluginName) => results[pluginName])
            .filter((plugin) => !plugins[plugin.name]);
        res = sortPluginList(res, query.sortBy, query.sortDir)
            .slice(query.offset, query.offset + query.limit);
        socket.emit('results:search', {results: res, query});
      } catch (er) {
        console.error(er);

        socket.emit('results:search', {results: {}, query});
      }
    });

    socket.on('install', (pluginName) => {
      install(pluginName, (err) => {
        if (err) console.warn(err.stack || err.toString());

        socket.emit('finished:install', {
          plugin: pluginName,
          code: err ? err.code : null,
          error: err ? err.message : null,
        });
      });
    });

    socket.on('uninstall', (pluginName) => {
      uninstall(pluginName, (err) => {
        if (err) console.warn(err.stack || err.toString());

        socket.emit('finished:uninstall', {plugin: pluginName, error: err ? err.message : null});
      });
    });
  });
  return cb();
};

const sortPluginList = (plugins, property, /* ASC?*/dir) => plugins.sort((a, b) => {
  if (a[property] < b[property]) {
    return dir ? -1 : 1;
  }

  if (a[property] > b[property]) {
    return dir ? 1 : -1;
  }

  // a must be equal to b
  return 0;
});
