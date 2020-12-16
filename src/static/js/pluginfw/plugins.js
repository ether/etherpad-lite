const fs = require('fs').promises;
const hooks = require('./hooks');
const npm = require('npm/lib/npm.js');
const readInstalled = require('./read-installed.js');
const path = require('path');
const tsort = require('./tsort');
const util = require('util');
const _ = require('underscore');
const settings = require('../../../node/utils/Settings');

const pluginUtils = require('./shared');
const defs = require('./plugin_defs');

exports.prefix = 'ep_';

exports.formatPlugins = function () {
  return _.keys(defs.plugins).join(', ');
};

exports.formatPluginsWithVersion = function () {
  const plugins = [];
  _.forEach(defs.plugins, (plugin) => {
    if (plugin.package.name !== 'ep_etherpad-lite') {
      const pluginStr = `${plugin.package.name}@${plugin.package.version}`;
      plugins.push(pluginStr);
    }
  });
  return plugins.join(', ');
};

exports.formatParts = function () {
  return _.map(defs.parts, (part) => part.full_name).join('\n');
};

exports.formatHooks = function (hook_set_name) {
  const res = [];
  const hooks = pluginUtils.extractHooks(defs.parts, hook_set_name || 'hooks');

  _.chain(hooks).keys().forEach((hook_name) => {
    _.forEach(hooks[hook_name], (hook) => {
      res.push(`<dt>${hook.hook_name}</dt><dd>${hook.hook_fn_name} from ${hook.part.full_name}</dd>`);
    });
  });
  return `<dl>${res.join('\n')}</dl>`;
};

const callInit = async () => {
  await Promise.all(Object.keys(defs.plugins).map(async (plugin_name) => {
    const plugin = defs.plugins[plugin_name];
    const ep_init = path.normalize(path.join(plugin.package.path, '.ep_initialized'));
    try {
      await fs.stat(ep_init);
    } catch (err) {
      await fs.writeFile(ep_init, 'done');
      await hooks.aCallAll(`init_${plugin_name}`, {});
    }
  }));
};

exports.pathNormalization = function (part, hook_fn_name, hook_name) {
  const tmp = hook_fn_name.split(':'); // hook_fn_name might be something like 'C:\\foo.js:myFunc'.
  // If there is a single colon assume it's 'filename:funcname' not 'C:\\filename'.
  const functionName = (tmp.length > 1 ? tmp.pop() : null) || hook_name;
  const moduleName = tmp.join(':') || part.plugin;
  const packageDir = path.dirname(defs.plugins[part.plugin].package.path);
  const fileName = path.normalize(path.join(packageDir, moduleName));
  return `${fileName}:${functionName}`;
};

exports.update = async function () {
  const packages = await exports.getPackages();
  const parts = {}; // Key is full name. sortParts converts this into a topologically sorted array.
  const plugins = {};

  // Load plugin metadata ep.json
  await Promise.all(Object.keys(packages).map(
      async (pluginName) => await loadPlugin(packages, pluginName, plugins, parts)));

  defs.plugins = plugins;
  defs.parts = sortParts(parts);
  defs.hooks = pluginUtils.extractHooks(defs.parts, 'hooks', exports.pathNormalization);
  defs.loaded = true;
  await callInit();
};

exports.getPackages = async function () {
  // Load list of installed NPM packages, flatten it to a list, and filter out only packages with names that
  const dir = settings.root;
  const data = await util.promisify(readInstalled)(dir);

  const packages = {};
  function flatten(deps) {
    _.chain(deps).keys().each((name) => {
      if (name.indexOf(exports.prefix) === 0) {
        packages[name] = _.clone(deps[name]);
        // Delete anything that creates loops so that the plugin
        // list can be sent as JSON to the web client
        delete packages[name].dependencies;
        delete packages[name].parent;
      }

      // I don't think we need recursion
      // if (deps[name].dependencies !== undefined) flatten(deps[name].dependencies);
    });
  }

  const tmp = {};
  tmp[data.name] = data;
  flatten(tmp[data.name].dependencies);
  return packages;
};

async function loadPlugin(packages, plugin_name, plugins, parts) {
  const plugin_path = path.resolve(packages[plugin_name].path, 'ep.json');
  try {
    const data = await fs.readFile(plugin_path);
    try {
      const plugin = JSON.parse(data);
      plugin.package = packages[plugin_name];
      plugins[plugin_name] = plugin;
      _.each(plugin.parts, (part) => {
        part.plugin = plugin_name;
        part.full_name = `${plugin_name}/${part.name}`;
        parts[part.full_name] = part;
      });
    } catch (ex) {
      console.error(`Unable to parse plugin definition file ${plugin_path}: ${ex.toString()}`);
    }
  } catch (er) {
    console.error(`Unable to load plugin definition file ${plugin_path}`);
  }
}

function partsToParentChildList(parts) {
  const res = [];
  _.chain(parts).keys().forEach((name) => {
    _.each(parts[name].post || [], (child_name) => {
      res.push([name, child_name]);
    });
    _.each(parts[name].pre || [], (parent_name) => {
      res.push([parent_name, name]);
    });
    if (!parts[name].pre && !parts[name].post) {
      res.push([name, `:${name}`]); // Include apps with no dependency info
    }
  });
  return res;
}

// Used only in Node, so no need for _
function sortParts(parts) {
  return tsort(
      partsToParentChildList(parts)
  ).filter(
      (name) => parts[name] !== undefined
  ).map(
      (name) => parts[name]
  );
}
