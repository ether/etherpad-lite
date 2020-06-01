var npm = require("npm/lib/npm.js");
var readInstalled = require("./read-installed.js");
var path = require("path");
var fs = require("fs");
var tsort = require("./tsort");
var util = require("util");
var _ = require("underscore");
var settings = require('../../../node/utils/Settings');

var pluginUtils = require('./shared');

exports.prefix = 'ep_';
exports.loaded = false;
exports.plugins = {};
exports.parts = [];
exports.hooks = {};

// @TODO RPB this appears to be unused
exports.ensure = function (cb) {
  if (!exports.loaded)
    exports.update(cb);
  else
    cb();
};

exports.formatPlugins = function () {
  return _.keys(exports.plugins).join(", ");
};

exports.formatPluginsWithVersion = function () {
  var plugins = [];
  _.forEach(exports.plugins, function(plugin){
    if(plugin.package.name !== "ep_etherpad-lite"){
      var pluginStr = plugin.package.name + "@" + plugin.package.version;
      plugins.push(pluginStr);
    }
  });
  return plugins.join(", ");
};

exports.formatParts = function () {
  return _.map(exports.parts, function (part) { return part.full_name; }).join("\n");
};

exports.formatHooks = function (hook_set_name) {
  var res = [];
  var hooks = pluginUtils.extractHooks(exports.parts, hook_set_name || "hooks");

  _.chain(hooks).keys().forEach(function (hook_name) {
    _.forEach(hooks[hook_name], function (hook) {
      res.push("<dt>" + hook.hook_name + "</dt><dd>" + hook.hook_fn_name + " from " + hook.part.full_name + "</dd>");
    });
  });
  return "<dl>" + res.join("\n") + "</dl>";
};

exports.callInit = function () {
  const fsp_stat = util.promisify(fs.stat);
  const fsp_writeFile = util.promisify(fs.writeFile);

  var hooks = require("./hooks");

  let p = Object.keys(exports.plugins).map(function (plugin_name) {
    let plugin = exports.plugins[plugin_name];
    let ep_init = path.normalize(path.join(plugin.package.path, ".ep_initialized"));
    return fsp_stat(ep_init).catch(async function() {
      await fsp_writeFile(ep_init, "done");
      await hooks.aCallAll("init_" + plugin_name, {});
    });
  });

  return Promise.all(p);
}

exports.pathNormalization = function (part, hook_fn_name) {
  return path.normalize(path.join(path.dirname(exports.plugins[part.plugin].package.path), hook_fn_name));
}

exports.update = async function () {
  let packages = await exports.getPackages();
  var parts = [];
  var plugins = {};

  // Load plugin metadata ep.json
  let p = Object.keys(packages).map(function (plugin_name) {
    return loadPlugin(packages, plugin_name, plugins, parts);
  });

  return Promise.all(p).then(function() {
    exports.plugins = plugins;
    exports.parts = sortParts(parts);
    exports.hooks = pluginUtils.extractHooks(exports.parts, "hooks", exports.pathNormalization);
    exports.loaded = true;
  }).then(exports.callInit);
}

exports.getPackages = async function () {
  // Load list of installed NPM packages, flatten it to a list, and filter out only packages with names that
  var dir = settings.root;
  let data = await util.promisify(readInstalled)(dir);

  var packages = {};
  function flatten(deps) {
    _.chain(deps).keys().each(function (name) {
      if (name.indexOf(exports.prefix) === 0) {
        packages[name] = _.clone(deps[name]);
        // Delete anything that creates loops so that the plugin
        // list can be sent as JSON to the web client
        delete packages[name].dependencies;
        delete packages[name].parent;
      }

      // I don't think we need recursion
      //if (deps[name].dependencies !== undefined) flatten(deps[name].dependencies);
    });
  }

  var tmp = {};
  tmp[data.name] = data;
  flatten(tmp[data.name].dependencies);
  return packages;
};

async function loadPlugin(packages, plugin_name, plugins, parts) {
  let fsp_readFile = util.promisify(fs.readFile);

  var plugin_path = path.resolve(packages[plugin_name].path, "ep.json");
  try {
    let data = await fsp_readFile(plugin_path);
    try {
      var plugin = JSON.parse(data);
      plugin['package'] = packages[plugin_name];
      plugins[plugin_name] = plugin;
      _.each(plugin.parts, function (part) {
        part.plugin = plugin_name;
        part.full_name = plugin_name + "/" + part.name;
        parts[part.full_name] = part;
      });
    } catch (ex) {
      console.error("Unable to parse plugin definition file " + plugin_path + ": " + ex.toString());
    }
  } catch (er) {
    console.error("Unable to load plugin definition file " + plugin_path);
  }
}

function partsToParentChildList(parts) {
  var res = [];
  _.chain(parts).keys().forEach(function (name) {
    _.each(parts[name].post || [], function (child_name)  {
      res.push([name, child_name]);
    });
    _.each(parts[name].pre || [], function (parent_name)  {
      res.push([parent_name, name]);
    });
    if (!parts[name].pre && !parts[name].post) {
      res.push([name, ":" + name]); // Include apps with no dependency info
    }
  });
  return res;
}

// Used only in Node, so no need for _
function sortParts(parts) {
  return tsort(
    partsToParentChildList(parts)
  ).filter(
    function (name) { return parts[name] !== undefined; }
  ).map(
    function (name) { return parts[name]; }
  );
}
