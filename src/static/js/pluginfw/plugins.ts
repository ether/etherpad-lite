'use strict';

import {Part} from "./plugin_defs";

const fs = require('fs').promises;
const hooks = require('./hooks');
import log4js from 'log4js';
import path from 'path';
const runCmd = require('../../../node/utils/run_cmd');
import {TSort} from './tsort';
const pluginUtils = require('./shared');
import {pluginDefs} from './plugin_defs';
import {IPluginInfo} from "live-plugin-manager";
const settings = require('../../../node/utils/Settings');

const logger = log4js.getLogger('plugins');

// Log the version of npm at startup.
(async () => {
  try {
    const version = await runCmd(['pnpm', '--version'], {stdio: [null, 'string']});
    logger.info(`pnpm --version: ${version}`);
  } catch (err) {
    // @ts-ignore
    logger.error(`Failed to get pnpm version: ${err.stack || err}`);
    // This isn't a fatal error so don't re-throw.
  }
})();

export const prefix = 'ep_';

export const formatPlugins = () => Object.keys(pluginDefs.getPlugins()).join(', ');

export const getPlugins = () => Object.keys(pluginDefs.getPlugins());

export const formatParts = () => pluginDefs.getParts().map((part) => part.full_name).join('\n');

export const getParts = () => pluginDefs.getParts().map((part) => part.full_name);

const sortHooks = (hookSetName: string, hooks: Map<string, Map<string,Map<string, string>>>) => {
  for (const [pluginName, def] of Object.entries(pluginDefs.getPlugins())) {
    for (const part of def.parts) {
      for (const [hookName, hookFnName] of Object.entries(part[hookSetName] || {})) {
        let hookEntry = hooks.get(hookName);
        if (!hookEntry) {
          hookEntry = new Map<string,Map<string, string>>();
          hooks.set(hookName, hookEntry);
        }
        let pluginEntry = hookEntry.get(pluginName);
        if (!pluginEntry) {
          pluginEntry = new Map<string, string>();
          hookEntry.set(pluginName, pluginEntry);
        }
        pluginEntry.set(part.name, hookFnName as string);
      }
    }
  }
};


export const getHooks = (hookSetName: string) => {
  const hooks = new Map();
  sortHooks(hookSetName, hooks);
  return hooks;
};

export const formatHooks = (hookSetName: string, html: string|false) => {
  let hooks:Map<string, Map<string,Map<string, string>>> = new Map();
  sortHooks(hookSetName, hooks);
  const lines = [];
  const sortStringKeys = (a: [string, Map<string, Map<string, string>>]| [string, Map<string, string>]|[string,string], b: [string, Map<string, Map<string, string>>]|[string,string]| [string, Map<string, string>]) => String(a[0]).localeCompare(b[0]);
  if (html) lines.push('<dl>');
  hooks = new Map([...hooks].sort(sortStringKeys));
  for (const [hookName, hookEntry] of hooks) {
    lines.push(html ? `  <dt>${hookName}:</dt><dd><dl>` : `  ${hookName}:`);
    const sortedHookEntry = new Map([...hookEntry].sort(sortStringKeys));
    hooks.set(hookName, sortedHookEntry);
    for (const [pluginName, pluginEntry] of sortedHookEntry) {
      lines.push(html ? `    <dt>${pluginName}:</dt><dd><dl>` : `    ${pluginName}:`);
      const sortedPluginEntry = new Map([...pluginEntry].sort(sortStringKeys));
      sortedHookEntry.set(pluginName, sortedPluginEntry);
      for (const [partName, hookFnName] of sortedPluginEntry) {
        lines.push(html
          ? `      <dt>${partName}:</dt><dd>${hookFnName}</dd>`
          : `      ${partName}: ${hookFnName}`);
      }
      if (html) lines.push('    </dl></dd>');
    }
    if (html) lines.push('  </dl></dd>');
  }
  if (html) lines.push('</dl>');
  return lines.join('\n');
};

export const pathNormalization = (part: Part, hookFnName: string, hookName: string) => {
  const tmp = hookFnName.split(':'); // hookFnName might be something like 'C:\\foo.js:myFunc'.
  // If there is a single colon assume it's 'filename:funcname' not 'C:\\filename'.
  const functionName = (tmp.length > 1 ? tmp.pop() : null) || hookName;
  const moduleName = tmp.join(':') || part.plugin;
  const packageDir = path.dirname(pluginDefs.getPlugins()[part.plugin!].package.path);
  const fileName = path.join(packageDir, moduleName!);
  return `${fileName}:${functionName}`;
};

export const update = async () => {
  const packages = await getPackages();
  const parts: MapArrayType<Part> = {}; // Key is full name. sortParts converts this into a topologically sorted array.
  const plugins:  MapArrayType<any> = {};

  // Load plugin metadata ep.json
  await Promise.all(Object.keys(packages).map(async (pluginName) => {
    logger.info(`Loading plugin ${pluginName}...`);
    await loadPlugin(packages, pluginName, plugins, parts);
  }));
  logger.info(`Loaded ${Object.keys(packages).length} plugins`);

  pluginDefs.setPlugins(plugins);
  pluginDefs.setParts(sortParts(parts));
  pluginDefs.setHooks(pluginUtils.extractHooks(pluginDefs.getParts(), 'hooks', pathNormalization))
  pluginDefs.setLoaded(true);

  await Promise.all(Object.keys(pluginDefs.getPlugins()).map(async (p) => {
    const logger = log4js.getLogger(`plugin:${p}`);
    await hooks.aCallAll(`init_${p}`, {logger});
  }));
};

import {linkInstaller} from "./installer";
import {MapArrayType} from "../../../node/types/MapType";
import {IPluginInfoExtended} from "./IPluginInfoExtended";

export const getPackages = async () => {
  const plugins = await linkInstaller.listPlugins();
  const newDependencies:MapArrayType<IPluginInfoExtended> = {};

  for (const plugin of plugins) {
    if (!plugin.name.startsWith(prefix)) {
      continue;
    }
    plugin.path = plugin.realPath = plugin.location;
    newDependencies[plugin.name] = plugin;
  }

  newDependencies['ep_etherpad-lite'] = {
    dependencies: {},
    location: "",
    mainFile: "",
    name: 'ep_etherpad-lite',
    version: settings.getEpVersion(),
    path: path.join(settings.root, 'node_modules/ep_etherpad-lite'),
    realPath: path.join(settings.root, 'src')
  };

  return newDependencies;
};

const loadPlugin = async (packages:  MapArrayType<IPluginInfoExtended>, pluginName: string, plugins:  MapArrayType<any>, parts: MapArrayType<Part>) => {
  const pluginPath = path.resolve(packages[pluginName].path!, 'ep.json');
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
    } catch (err: any) {
      logger.error(`Unable to parse plugin definition file ${pluginPath}: ${err.stack || err}`);
    }
  } catch (err: any) {
    logger.error(`Unable to load plugin definition file ${pluginPath}: ${err.stack || err}`);
  }
};

const partsToParentChildList = (parts: MapArrayType<Part>) => {
  const res:[string,string][] = [];
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
const sortParts = (parts: MapArrayType<Part>) => new TSort(partsToParentChildList(parts)).getSorted()
  .filter((name) => parts[name] !== undefined)
  .map((name) => parts[name]);
