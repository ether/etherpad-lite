const log4js = require('log4js');
var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
var npm = require("npm");
var request = require("request");
const util = require('util');

let npmIsLoaded = false;
const loadNpm = async () => {
  if (npmIsLoaded) return;
  await util.promisify(npm.load)({});
  npmIsLoaded = true;
  npm.on('log', log4js.getLogger('npm').log);
};

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

exports.uninstall = async (pluginName, cb = null) => {
  cb = wrapTaskCb(cb);
  try {
    await loadNpm();
    await util.promisify(npm.commands.uninstall)([pluginName]);
    await hooks.aCallAll('pluginUninstall', {pluginName});
    await plugins.update();
  } catch (err) {
    cb(err || new Error(err));
    throw err;
  }
  cb(null);
};

exports.install = async (pluginName, cb = null) => {
  cb = wrapTaskCb(cb);
  try {
    await loadNpm();
    await util.promisify(npm.commands.install)([pluginName]);
    await hooks.aCallAll('pluginInstall', {pluginName});
    await plugins.update();
  } catch (err) {
    cb(err || new Error(err));
    throw err;
  }
  cb(null);
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
