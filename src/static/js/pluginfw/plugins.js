const fs = require('fs').promises;
const hooks = require('./hooks');
var npm = require("npm/lib/npm.js");
var readInstalled = require("./read-installed.js");
var path = require("path");
var tsort = require("./tsort");
var util = require("util");
var _ = require("underscore");
var settings = require('../../../node/utils/Settings');

var pluginUtils = require('./shared');
var defs = require('./plugin_defs');

exports.prefix = 'ep_';

exports.formatPlugins = function () {
  return _.keys(defs.plugins).join(", ");
};

exports.formatPluginsWithVersion = function () {
  var plugins = [];
  _.forEach(defs.plugins, function(plugin) {
    if(plugin.package.name !== "ep_etherpad-lite"){
      var pluginStr = plugin.package.name + "@" + plugin.package.version;
      plugins.push(pluginStr);
    }
  });
  return plugins.join(", ");
};

exports.formatParts = function () {
  return _.map(defs.parts, function(part) { return part.full_name; }).join('\n');
};

exports.formatHooks = function (hook_set_name) {
  var res = [];
  var hooks = pluginUtils.extractHooks(defs.parts, hook_set_name || 'hooks');

  _.chain(hooks).keys().forEach(function (hook_name) {
    _.forEach(hooks[hook_name], function (hook) {
      res.push("<dt>" + hook.hook_name + "</dt><dd>" + hook.hook_fn_name + " from " + hook.part.full_name + "</dd>");
    });
  });
  return "<dl>" + res.join("\n") + "</dl>";
};

const callInit = async () => {
  await Promise.all(Object.keys(defs.plugins).map(async (plugin_name) => {
    let plugin = defs.plugins[plugin_name];
    let ep_init = path.normalize(path.join(plugin.package.path, ".ep_initialized"));
    try {
      await fs.stat(ep_init);
    } catch (err) {
      await fs.writeFile(ep_init, 'done');
      await hooks.aCallAll("init_" + plugin_name, {});
    }
  }));
}

exports.pathNormalization = function (part, hook_fn_name, hook_name) {
  const tmp = hook_fn_name.split(':'); // hook_fn_name might be something like 'C:\\foo.js:myFunc'.
  // If there is a single colon assume it's 'filename:funcname' not 'C:\\filename'.
  const functionName = (tmp.length > 1 ? tmp.pop() : null) || hook_name;
  const moduleName = tmp.join(':') || part.plugin;
  const packageDir = path.dirname(defs.plugins[part.plugin].package.path);
  const fileName = path.normalize(path.join(packageDir, moduleName));
  return `${fileName}:${functionName}`;
}

exports.update = async function () {
  let packages = await exports.getPackages();
  var parts = {}; // Key is full name. sortParts converts this into a topologically sorted array.
  var plugins = {};

  // Load plugin metadata ep.json
  await Promise.all(Object.keys(packages).map(
    async (pluginName) => await loadPlugin(packages, pluginName, plugins, parts)));

  defs.plugins = plugins;
  defs.parts = sortParts(parts);
  defs.hooks = pluginUtils.extractHooks(defs.parts, 'hooks', exports.pathNormalization);
  defs.loaded = true;
  await callInit();
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
  var plugin_path = path.resolve(packages[plugin_name].path, "ep.json");
  try {
    let data = await fs.readFile(plugin_path);
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
