var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
var npm = require("npm");
var registry = require("npm/lib/utils/npm-registry-client/index.js");

exports.uninstall = function(plugin_name, cb) {
  npm.load({}, function (er) {
    if (er) return cb(er)
    npm.commands.uninstall([plugin_name],  function (er) {
      if (er) return cb(er);
      hooks.aCallAll("pluginUninstall", {plugin_name: plugin_name}, function (er) {
        cb(er);
      });
    })
  })
}

exports.install = function(plugin_name, cb) {
  npm.load({}, function (er) {
    if (er) return cb(er)
    npm.commands.install([plugin_name], function (er) {
      if (er) return cb(er);
      hooks.aCallAll("pluginInstall", {plugin_name: plugin_name}, function (er) {
        cb(er);
      });
    });
  })
}

exports.search = function(pattern, cb) {
  npm.load({}, function (er) {
    registry.get(
      "/-/all", null, 600, false, true,
      function (er, data) {
        if (er) return cb(er);
        var res = {};
        for (key in data) {
            if (/*key.indexOf(plugins.prefix) == 0 &&*/ key.indexOf(pattern) != -1)
            res[key] = data[key];
        }
        cb(null, res);
      }
    );
  });
}
