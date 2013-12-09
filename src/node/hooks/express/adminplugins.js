var path = require('path');
var eejs = require('ep_etherpad-lite/node/eejs');
var installer = require('ep_etherpad-lite/static/js/pluginfw/installer');
var plugins = require('ep_etherpad-lite/static/js/pluginfw/plugins');
var _ = require('underscore');
var semver = require('semver');
var async = require('async');

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/admin/plugins', function(req, res) {
    var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
    var render_args = {
      plugins: plugins.plugins,
      search_results: {},
      errors: [],
    };

    res.send( eejs.require("ep_etherpad-lite/templates/admin/plugins.html", render_args) );
  });
  args.app.get('/admin/plugins/info', function(req, res) {
    res.send( eejs.require("ep_etherpad-lite/templates/admin/plugins-info.html", {}) );
  });
}

exports.socketio = function (hook_name, args, cb) {
  var io = args.io.of("/pluginfw/installer");
  io.on('connection', function (socket) {
    if (!socket.handshake.session.user || !socket.handshake.session.user.is_admin) return;

    socket.on("getInstalled", function (query) {
      // send currently installed plugins
      var installed = Object.keys(plugins.plugins).map(function(plugin) {
        return plugins.plugins[plugin].package
      })
      socket.emit("results:installed", {installed: installed});
    });
    
    socket.on("checkUpdates", function() {
      // Check plugins for updates
      installer.getAvailablePlugins(/*maxCacheAge:*/60*10, function(er, results) {
        if(er) {
          console.warn(er);
          socket.emit("results:updatable", {updatable: {}});
          return;
        }
        var updatable = _(plugins.plugins).keys().filter(function(plugin) {
          if(!results[plugin]) return false;
          var latestVersion = results[plugin].version
          var currentVersion = plugins.plugins[plugin].package.version
          return semver.gt(latestVersion, currentVersion)
        });
        socket.emit("results:updatable", {updatable: updatable});
      });
    })
    
    socket.on("getAvailable", function (query) {
        installer.getAvailablePlugins(/*maxCacheAge:*/false, function (er, results) {
          if(er) {
            console.error(er)
            results = {}
          }
          socket.emit("results:available", results);
      });
    });

    socket.on("search", function (query) {
      installer.search(query.searchTerm, /*maxCacheAge:*/60*10, function (er, results) {
        if(er) {
          console.error(er)
          results = {}
        }
        var res = Object.keys(results)
          .map(function(pluginName) {
            return results[pluginName]
          })
          .filter(function(plugin) {
            return !plugins.plugins[plugin.name]
          });
        res = sortPluginList(res, query.sortBy, query.sortDir)
          .slice(query.offset, query.offset+query.limit);
        socket.emit("results:search", {results: res, query: query});
      });
    });

    socket.on("install", function (plugin_name) {
      installer.install(plugin_name, function (er) {
        if(er) console.warn(er)
        socket.emit("finished:install", {plugin: plugin_name, error: er? er.message : null});
      });
    });

    socket.on("uninstall", function (plugin_name) {
      installer.uninstall(plugin_name, function (er) {
        if(er) console.warn(er)
        socket.emit("finished:uninstall", {plugin: plugin_name, error: er? er.message : null});
      });
    });
  });
}

function sortPluginList(plugins, property, /*ASC?*/dir) {
  return plugins.sort(function(a, b) {
    if (a[property] < b[property])
       return dir? -1 : 1;
    if (a[property] > b[property])
       return dir? 1 : -1;
    // a must be equal to b
    return 0;
  })
}