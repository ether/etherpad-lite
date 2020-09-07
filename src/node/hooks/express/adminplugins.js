var eejs = require('ep_etherpad-lite/node/eejs');
var settings = require('ep_etherpad-lite/node/utils/Settings');
var installer = require('ep_etherpad-lite/static/js/pluginfw/installer');
var plugins = require('ep_etherpad-lite/static/js/pluginfw/plugin_defs');
var _ = require('underscore');
var semver = require('semver');
const UpdateCheck = require('ep_etherpad-lite/node/utils/UpdateCheck');

exports.expressCreateServer = function(hook_name, args, cb) {
  args.app.get('/admin/plugins', function(req, res) {
    var render_args = {
      plugins: plugins.plugins,
      search_results: {},
      errors: [],
    };

    res.send(eejs.require("ep_etherpad-lite/templates/admin/plugins.html", render_args));
  });

  args.app.get('/admin/plugins/info', function(req, res) {
    var gitCommit = settings.getGitCommit();
    var epVersion = settings.getEpVersion();

    res.send(eejs.require("ep_etherpad-lite/templates/admin/plugins-info.html", {
      gitCommit: gitCommit,
      epVersion: epVersion,
      latestVersion: UpdateCheck.getLatestVersion()
    }));
  });
}

exports.socketio = function(hook_name, args, cb) {
  var io = args.io.of("/pluginfw/installer");
  io.on('connection', function(socket) {
    if (!socket.conn.request.session || !socket.conn.request.session.user || !socket.conn.request.session.user.is_admin) return;

    socket.on("getInstalled", function(query) {
      // send currently installed plugins
      var installed = Object.keys(plugins.plugins).map(function(plugin) {
        return plugins.plugins[plugin].package
      });

      socket.emit("results:installed", {installed: installed});
    });

    socket.on("checkUpdates", async function() {
      // Check plugins for updates
      try {
        let results = await installer.getAvailablePlugins(/*maxCacheAge:*/ 60 * 10);

        var updatable = _(plugins.plugins).keys().filter(function(plugin) {
          if (!results[plugin]) return false;

          var latestVersion = results[plugin].version;
          var currentVersion = plugins.plugins[plugin].package.version;

          return semver.gt(latestVersion, currentVersion);
        });

        socket.emit("results:updatable", {updatable: updatable});
      } catch (er) {
        console.warn(er);

        socket.emit("results:updatable", {updatable: {}});
      }
    });

    socket.on("getAvailable", async function(query) {
      try {
        let results = await installer.getAvailablePlugins(/*maxCacheAge:*/ false);
        socket.emit("results:available", results);
      } catch (er) {
        console.error(er);
        socket.emit("results:available", {});
      }
    });

    socket.on("search", async function(query) {
      try {
        let results = await installer.search(query.searchTerm, /*maxCacheAge:*/ 60 * 10);
        var res = Object.keys(results)
          .map(function(pluginName) {
            return results[pluginName];
          })
          .filter(function(plugin) {
            return !plugins.plugins[plugin.name];
          });
        res = sortPluginList(res, query.sortBy, query.sortDir)
          .slice(query.offset, query.offset+query.limit);
        socket.emit("results:search", {results: res, query: query});
      } catch (er) {
        console.error(er);

        socket.emit("results:search", {results: {}, query: query});
      }
    });

    socket.on("install", function(plugin_name) {
      installer.install(plugin_name, function(er) {
        if (er) console.warn(er);

        socket.emit("finished:install", {plugin: plugin_name, code: er? er.code : null, error: er? er.message : null});
      });
    });

    socket.on("uninstall", function(plugin_name) {
      installer.uninstall(plugin_name, function(er) {
        if (er) console.warn(er);

        socket.emit("finished:uninstall", {plugin: plugin_name, error: er? er.message : null});
      });
    });
  });
}

function sortPluginList(plugins, property, /*ASC?*/dir) {
  return plugins.sort(function(a, b) {
    if (a[property] < b[property]) {
      return dir? -1 : 1;
    }

    if (a[property] > b[property]) {
      return dir? 1 : -1;
    }

    // a must be equal to b
    return 0;
  });
}
