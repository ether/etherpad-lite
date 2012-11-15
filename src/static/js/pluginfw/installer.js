var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
var npm = require("npm");
var RegClient = require("npm-registry-client")

var registry = new RegClient(
{ registry: "http://registry.npmjs.org"
, cache: npm.cache }
);

var withNpm = function (npmfn, final, cb) {
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
      final();
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
    function () {
      hooks.aCallAll("restartServer", {}, function () {});                
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
    function () {
      hooks.aCallAll("restartServer", {}, function () {});                
    },
    cb
  );
};

exports.searchCache = null;

exports.search = function(query, cache, cb) {
  withNpm(
    function (cb) {
      var getData = function (cb) {
        if (cache && exports.searchCache) {
          cb(null, exports.searchCache);
        } else {
          registry.get(
            "/-/all", 600, false, true,
            function (er, data) {
              if (er) return cb(er);
              exports.searchCache = data;
              cb(er, data);
            }
          );
        }
      }
      getData(
        function (er, data) {
          if (er) return cb(er);
          var res = {};
          var i = 0;
          for (key in data) {
            if (   key.indexOf(plugins.prefix) == 0
                && key.indexOf(query.pattern) != -1) {
              i++;
              if (i > query.offset
                  && i <= query.offset + query.limit) {
                res[key] = data[key];
              }
            }
          }
          cb(null, {results:res, query: query, total:i});
        }
      );
    },
    function () { },
    cb
  );
};
