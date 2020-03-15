var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
var npm = require("npm");
var request = require("request");

var npmIsLoaded = false;
var withNpm = function(npmfn) {
  if (npmIsLoaded) return npmfn();

  npm.load({}, function(er) {
    if (er) return npmfn(er);

    npmIsLoaded = true;
    npm.on("log", function(message) {
      console.log('npm: ',message)
    });
    npmfn();
  });
}

var tasks = 0

function wrapTaskCb(cb) {
  tasks++;

  return function() {
    cb && cb.apply(this, arguments);
    tasks--;
    if (tasks == 0) onAllTasksFinished();
  }
}

function onAllTasksFinished() {
  hooks.aCallAll("restartServer", {}, function() {});
}

/*
 * We cannot use arrow functions in this file, because code in /src/static
 * can end up being loaded in browsers, and we still support IE11.
 */
exports.uninstall = function(plugin_name, cb) {
  cb = wrapTaskCb(cb);

  withNpm(function(er) {
    if (er) return cb && cb(er);

    npm.commands.uninstall([plugin_name], function(er) {
      if (er) return cb && cb(er);
      hooks.aCallAll("pluginUninstall", {plugin_name: plugin_name})
        .then(plugins.update)
        .then(function() { cb(null) })
        .catch(function(er) { cb(er) });
    });
  });
};

/*
 * We cannot use arrow functions in this file, because code in /src/static
 * can end up being loaded in browsers, and we still support IE11.
 */
exports.install = function(plugin_name, cb) {
  cb = wrapTaskCb(cb);

  withNpm(function(er) {
    if (er) return cb && cb(er);

    npm.commands.install([plugin_name], function(er) {
      if (er) return cb && cb(er);
      hooks.aCallAll("pluginInstall", {plugin_name: plugin_name})
        .then(plugins.update)
        .then(function() { cb(null) })
        .catch(function(er) { cb(er) });
    });
  });
};

exports.availablePlugins = null;
var cacheTimestamp = 0;

exports.getAvailablePlugins = function(maxCacheAge) {
  var nowTimestamp = Math.round(Date.now() / 1000);

  return new Promise(function(resolve, reject) {
    // check cache age before making any request
    if (exports.availablePlugins && maxCacheAge && (nowTimestamp - cacheTimestamp) <= maxCacheAge) {
      return resolve(exports.availablePlugins);
    }

    request("https://static.etherpad.org/plugins.json", function(er, response, plugins) {
      if (er) return reject(er);

      try {
        plugins = JSON.parse(plugins);
      } catch (err) {
        console.error('error parsing plugins.json:', err);
        plugins = [];
      }

      exports.availablePlugins = plugins;
      cacheTimestamp = nowTimestamp;
      resolve(plugins);
    });
  });
};


exports.search = function(searchTerm, maxCacheAge) {
  return exports.getAvailablePlugins(maxCacheAge).then(function(results) {
    var res = {};

    if (searchTerm) {
      searchTerm = searchTerm.toLowerCase();
    }

    for (var pluginName in results) {
      // for every available plugin
      if (pluginName.indexOf(plugins.prefix) != 0) continue; // TODO: Also search in keywords here!

      if (searchTerm && !~results[pluginName].name.toLowerCase().indexOf(searchTerm)
         && (typeof results[pluginName].description != "undefined" && !~results[pluginName].description.toLowerCase().indexOf(searchTerm) )
           ) {
           if (typeof results[pluginName].description === "undefined") {
             console.debug('plugin without Description: %s', results[pluginName].name);
           }

           continue;
      }

      res[pluginName] = results[pluginName];
    }

    return res;
  });
};
