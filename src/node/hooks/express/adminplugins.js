const eejs = require('ep_etherpad-lite/node/eejs');
const settings = require('ep_etherpad-lite/node/utils/Settings');
const installer = require('ep_etherpad-lite/static/js/pluginfw/installer');
const plugins = require('ep_etherpad-lite/static/js/pluginfw/plugin_defs');
const _ = require('underscore');
const semver = require('semver');
const UpdateCheck = require('ep_etherpad-lite/node/utils/UpdateCheck');

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/admin/plugins', (req, res) => {
    res.send(eejs.require('ep_etherpad-lite/templates/admin/plugins.html', {
      plugins: plugins.plugins,
      req,
      search_results: {},
      errors: [],
    }));
  });

  args.app.get('/admin/plugins/info', (req, res) => {
    const gitCommit = settings.getGitCommit();
    const epVersion = settings.getEpVersion();

    res.send(eejs.require('ep_etherpad-lite/templates/admin/plugins-info.html', {
      gitCommit,
      epVersion,
      latestVersion: UpdateCheck.getLatestVersion(),
      req,
    }));
  });

  return cb();
};

exports.socketio = function (hook_name, args, cb) {
  const io = args.io.of('/pluginfw/installer');
  io.on('connection', (socket) => {
    if (!socket.conn.request.session || !socket.conn.request.session.user || !socket.conn.request.session.user.is_admin) return;

    socket.on('getInstalled', (query) => {
      // send currently installed plugins
      const installed = Object.keys(plugins.plugins).map((plugin) => plugins.plugins[plugin].package);

      socket.emit('results:installed', {installed});
    });

    socket.on('checkUpdates', async () => {
      // Check plugins for updates
      try {
        const results = await installer.getAvailablePlugins(/* maxCacheAge:*/ 60 * 10);

        const updatable = _(plugins.plugins).keys().filter((plugin) => {
          if (!results[plugin]) return false;

          const latestVersion = results[plugin].version;
          const currentVersion = plugins.plugins[plugin].package.version;

          return semver.gt(latestVersion, currentVersion);
        });

        socket.emit('results:updatable', {updatable});
      } catch (er) {
        console.warn(er);

        socket.emit('results:updatable', {updatable: {}});
      }
    });

    socket.on('getAvailable', async (query) => {
      try {
        const results = await installer.getAvailablePlugins(/* maxCacheAge:*/ false);
        socket.emit('results:available', results);
      } catch (er) {
        console.error(er);
        socket.emit('results:available', {});
      }
    });

    socket.on('search', async (query) => {
      try {
        const results = await installer.search(query.searchTerm, /* maxCacheAge:*/ 60 * 10);
        let res = Object.keys(results)
            .map((pluginName) => results[pluginName])
            .filter((plugin) => !plugins.plugins[plugin.name]);
        res = sortPluginList(res, query.sortBy, query.sortDir)
            .slice(query.offset, query.offset + query.limit);
        socket.emit('results:search', {results: res, query});
      } catch (er) {
        console.error(er);

        socket.emit('results:search', {results: {}, query});
      }
    });

    socket.on('install', (plugin_name) => {
      installer.install(plugin_name, (er) => {
        if (er) console.warn(er);

        socket.emit('finished:install', {plugin: plugin_name, code: er ? er.code : null, error: er ? er.message : null});
      });
    });

    socket.on('uninstall', (plugin_name) => {
      installer.uninstall(plugin_name, (er) => {
        if (er) console.warn(er);

        socket.emit('finished:uninstall', {plugin: plugin_name, error: er ? er.message : null});
      });
    });
  });
  return cb();
};

function sortPluginList(plugins, property, /* ASC?*/dir) {
  return plugins.sort((a, b) => {
    if (a[property] < b[property]) {
      return dir ? -1 : 1;
    }

    if (a[property] > b[property]) {
      return dir ? 1 : -1;
    }

    // a must be equal to b
    return 0;
  });
}
