var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
var npm = require("npm");
var registry = require("npm/lib/utils/npm-registry-client/index.js");

var withNpm = function (npmfn, cb) {
  npm.load({}, function (er) {
    if (er) return cb({progress:1, error:er});
    npm.on("log", function (message) {
      cb({progress: 0.5, message:message.msg + ": " + message.pref});
    });
    npmfn(function (er, data) {
      if (er) return cb({progress:1, error:er.code + ": " + er.path});
      if (!data) data = {};
      data.progress = 1;
      data.message = "Done.";
      cb(data);
    });
  });
}

// All these functions call their callback multiple times with
// {progress:[0,1], message:STRING, error:object}. They will call it
// with progress = 1 at least once, and at all times will either
// message or error be present, not both. It can be called multiple
// times for all values of propgress except for 1.

exports.uninstall = function(plugin_name, cb) {
  withNpm(
    function (cb) {
      npm.commands.uninstall([plugin_name], function (er) {
        if (er) return cb(er);
        hooks.aCallAll("pluginUninstall", {plugin_name: plugin_name}, function (er, data) {
          if (er) return cb(er);
          plugins.update(cb);
        });
      });
    },
    cb
  );
};

exports.install = function(plugin_name, cb) {
  withNpm(
    function (cb) {
      npm.commands.install([plugin_name], function (er) {
        if (er) return cb(er);
        hooks.aCallAll("pluginInstall", {plugin_name: plugin_name}, function (er, data) {
          if (er) return cb(er);
          plugins.update(cb);
        });
      });
    },
    cb
  );
};

exports.search = function(pattern, cb) {
  withNpm(
    function (cb) {
      registry.get(
        "/-/all", null, 600, false, true,
        function (er, data) {
          if (er) return cb(er);
          var res = {};
          for (key in data) {
            if (key.indexOf(plugins.prefix) == 0 && key.indexOf(pattern) != -1)
              res[key] = data[key];
          }
          cb(null, {results:res});
        }
      );
    },
    cb
  );
};
