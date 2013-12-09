var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
var npm = require("npm");

var npmIsLoaded = false;
var withNpm = function (npmfn) {
  if(npmIsLoaded) return npmfn();
  npm.load({}, function (er) {
    if (er) return npmfn(er);
    npmIsLoaded = true;
    npm.on("log", function (message) {
      console.log('npm: ',message)
    });
    npmfn();
  });
}

var tasks = 0
function wrapTaskCb(cb) {
  tasks++
  return function() {
    cb && cb.apply(this, arguments);
    tasks--;
    if(tasks == 0) onAllTasksFinished();
  }
}
function onAllTasksFinished() {
  hooks.aCallAll("restartServer", {}, function () {});
}

exports.uninstall = function(plugin_name, cb) {
  cb = wrapTaskCb(cb);
  withNpm(function (er) {
    if (er) return cb && cb(er);
    npm.commands.uninstall([plugin_name], function (er) {
      if (er) return cb && cb(er);
      hooks.aCallAll("pluginUninstall", {plugin_name: plugin_name}, function (er, data) {
        if (er) return cb(er);
        plugins.update(cb);
      });
    });
  });
};

exports.install = function(plugin_name, cb) {
  cb = wrapTaskCb(cb)
  withNpm(function (er) {
    if (er) return cb && cb(er);
    npm.commands.install([plugin_name], function (er) {
      if (er) return cb && cb(er);
      hooks.aCallAll("pluginInstall", {plugin_name: plugin_name}, function (er, data) {
        if (er) return cb(er);
        plugins.update(cb);
      });
    });
  });
};

exports.availablePlugins = null;
var cacheTimestamp = 0;

exports.getAvailablePlugins = function(maxCacheAge, cb) {
  withNpm(function (er) {
    if (er) return cb && cb(er);
    if(exports.availablePlugins && maxCacheAge && Math.round(+new Date/1000)-cacheTimestamp <= maxCacheAge) {
      return cb && cb(null, exports.availablePlugins)
    }
    npm.commands.search(['ep_'], /*silent?*/true, function(er, results) {
      if(er) return cb && cb(er);
      exports.availablePlugins = results;
      cacheTimestamp = Math.round(+new Date/1000);
      cb && cb(null, results)
    })
  });
};


exports.search = function(searchTerm, maxCacheAge, cb) {
  exports.getAvailablePlugins(maxCacheAge, function(er, results) {
    if(er) return cb && cb(er);
    var res = {};
    if (searchTerm)
      searchTerm = searchTerm.toLowerCase();
    for (var pluginName in results) { // for every available plugin
      if (pluginName.indexOf(plugins.prefix) != 0) continue; // TODO: Also search in keywords here!

      if(searchTerm && !~pluginName.toLowerCase().indexOf(searchTerm) && !~results[pluginName].description.toLowerCase().indexOf(searchTerm)) continue;
      res[pluginName] = results[pluginName];
    }
    cb && cb(null, res)
  })
};
