'use strict';

const fs = require('fs').promises;
const hooks = require('./hooks');
const path = require('path');
const runNpm = require('../../../node/utils/run_npm');
const tsort = require('./tsort');
const util = require('util');
const settings = require('../../../node/utils/Settings');

const pluginUtils = require('./shared');
const defs = require('./plugin_defs');

exports.prefix = 'ep_';

exports.formatPlugins = () => Object.keys(defs.plugins).join(', ');

exports.formatParts = () => defs.parts.map((part) => part.full_name).join('\n');

exports.formatHooks = (hookSetName) => {
  const res = [];
  const hooks = pluginUtils.extractHooks(defs.parts, hookSetName || 'hooks');
  for (const registeredHooks of Object.values(hooks)) {
    for (const hook of registeredHooks) {
      res.push(`<dt>${hook.hook_name}</dt><dd>${hook.hook_fn_name} ` +
               `from ${hook.part.full_name}</dd>`);
    }
  }
  return `<dl>${res.join('\n')}</dl>`;
};

const callInit = async () => {
  await Promise.all(Object.keys(defs.plugins).map(async (pluginName) => {
    const plugin = defs.plugins[pluginName];
    const epInit = path.normalize(path.join(plugin.package.path, '.ep_initialized'));
    try {
      await fs.stat(epInit);
    } catch (err) {
      await fs.writeFile(epInit, 'done');
      await hooks.aCallAll(`init_${pluginName}`, {});
    }
  }));
};

exports.pathNormalization = (part, hookFnName, hookName) => {
  const tmp = hookFnName.split(':'); // hookFnName might be something like 'C:\\foo.js:myFunc'.
  // If there is a single colon assume it's 'filename:funcname' not 'C:\\filename'.
  const functionName = (tmp.length > 1 ? tmp.pop() : null) || hookName;
  const moduleName = tmp.join(':') || part.plugin;
  const packageDir = path.dirname(defs.plugins[part.plugin].package.path);
  const fileName = path.normalize(path.join(packageDir, moduleName));
  return `${fileName}:${functionName}`;
};

exports.update = async () => {
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

exports.getPackages = async () => {
  // Note: Do not pass `--prod` because it does not work if there is no package.json.
  const np = runNpm(['ls', '--long', '--json', '--depth=0'], {
    stdoutLogger: null, // We want to capture stdout, so don't attempt to log it.
    env: {
      ...process.env,
      // NODE_ENV must be set to development for `npm ls` to show files without a package.json.
      NODE_ENV: 'development',
    },
  });
  const chunks = [];
  await Promise.all([
    (async () => { for await (const chunk of np.stdout) chunks.push(chunk); })(),
    np, // Await in parallel to avoid unhandled rejection if np rejects during chunk read.
  ]);
  const {dependencies = {}} = JSON.parse(Buffer.concat(chunks).toString());
  await Promise.all(Object.entries(dependencies).map(async ([pkg, info]) => {
    if (!pkg.startsWith(exports.prefix)) {
      delete dependencies[pkg];
      return;
    }
    info.realPath = await fs.realpath(info.path);
  }));
  return dependencies;
};

const loadPlugin = async (packages, pluginName, plugins, parts) => {
  const pluginPath = path.resolve(packages[pluginName].path, 'ep.json');
  try {
    const data = await fs.readFile(pluginPath);
    try {
      const plugin = JSON.parse(data);
      plugin.package = packages[pluginName];
      plugins[pluginName] = plugin;
      for (const part of plugin.parts) {
        part.plugin = pluginName;
        part.full_name = `${pluginName}/${part.name}`;
        parts[part.full_name] = part;
      }
    } catch (ex) {
      console.error(`Unable to parse plugin definition file ${pluginPath}: ${ex.toString()}`);
    }
  } catch (er) {
    console.error(`Unable to load plugin definition file ${pluginPath}`);
  }
};

const partsToParentChildList = (parts) => {
  const res = [];
  for (const name of Object.keys(parts)) {
    for (const childName of parts[name].post || []) {
      res.push([name, childName]);
    }
    for (const parentName of parts[name].pre || []) {
      res.push([parentName, name]);
    }
    if (!parts[name].pre && !parts[name].post) {
      res.push([name, `:${name}`]); // Include apps with no dependency info
    }
  }
  return res;
};

// Used only in Node, so no need for _
const sortParts = (parts) => tsort(partsToParentChildList(parts))
    .filter((name) => parts[name] !== undefined)
    .map((name) => parts[name]);
