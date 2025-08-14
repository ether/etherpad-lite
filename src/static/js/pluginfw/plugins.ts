import { promises as fs } from 'node:fs';
import hooks from './hooks';
import log4js from 'log4js';
import path from 'node:path';
import runCmd from '../../../node/utils/run_cmd';
import tsort from './tsort';
const pluginUtils = require('./shared');
import defs from './plugin_defs';
import settings, {
  getEpVersion,
} from '../../../node/utils/Settings';
import {MapArrayType} from "../../../node/types/MapType";
import {PackageInfo} from "../../../node/types/PackageInfo";
import {IPluginInfo} from "live-plugin-manager";

const logger = log4js.getLogger('plugins');

// Log the version of npm at startup.
(async () => {
  try {
    // @ts-ignore
    const version = await runCmd.run_cmd(['pnpm', '--version'], {stdio: [null, 'string']});
    logger.info(`pnpm --version: ${version}`);
  } catch (err: any) {
    logger.error(`Failed to get pnpm version: ${err.stack || err}`);
    // This isn't a fatal error so don't re-throw.
  }
})();

type Plugin = {

}

type Part = {
  full_name: string;
  plugin: string;
  post: string
  pre: string[];
}

export const prefix = 'ep_';




export const formatPlugins = () => Object.keys(defs.plugins).join(', ');

export const getPlugins = () => Object.keys(defs.plugins);

export const formatParts = () => defs.parts.map((part: Part) => part.full_name).join('\n');

export const getParts = () => defs.parts.map((part: Part) => part.full_name);

const sortHooks = (hookSetName: string, hooks: Map<string, any>) => {
  for (const [pluginName, def] of Object.entries(defs.plugins)) {
    // @ts-ignore
    for (const part of def.parts) {
      for (const [hookName, hookFnName] of Object.entries(part[hookSetName] || {})) {
        let hookEntry = hooks.get(hookName);
        if (!hookEntry) {
          hookEntry = new Map();
          hooks.set(hookName, hookEntry);
        }
        let pluginEntry = hookEntry.get(pluginName);
        if (!pluginEntry) {
          pluginEntry = new Map();
          hookEntry.set(pluginName, pluginEntry);
        }
        pluginEntry.set(part.name, hookFnName);
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
  let hooks = new Map();
  sortHooks(hookSetName, hooks);
  const lines = [];
  const sortStringKeys = (a: string, b: string) => String(a[0]).localeCompare(b[0]);
  if (html) lines.push('<dl>');
  // @ts-ignore
  hooks = new Map([...hooks].sort(sortStringKeys));
  for (const [hookName, hookEntry] of hooks) {
    lines.push(html ? `  <dt>${hookName}:</dt><dd><dl>` : `  ${hookName}:`);
    const sortedHookEntry = new Map([...hookEntry].sort(sortStringKeys));
    hooks.set(hookName, sortedHookEntry);
    for (const [pluginName, pluginEntry] of sortedHookEntry) {
      lines.push(html ? `    <dt>${pluginName}:</dt><dd><dl>` : `    ${pluginName}:`);
      // @ts-ignore
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
  const packageDir = path.dirname(defs.plugins[part.plugin].package.path);
  const fileName = path.join(packageDir, moduleName);
  return `${fileName}:${functionName}`;
};

export const update = async () => {
  const packages = await getPackages();
  const parts: Record<string,  Part> = {}; // Key is full name. sortParts converts this into a topologically sorted array.
  const plugins = {};

  // Load plugin metadata ep.json
  await Promise.all(Object.keys(packages).map(async (pluginName) => {
    logger.info(`Loading plugin ${pluginName}...`);
    await loadPlugin(packages, pluginName, plugins, parts);
  }));
  logger.info(`Loaded ${Object.keys(packages).length} plugins`);

  defs.plugins = plugins;
  defs.parts = sortParts(parts);
  defs.hooks = pluginUtils.extractHooks(defs.parts, 'hooks', pathNormalization);
  defs.loaded = true;
  await Promise.all(Object.keys(defs.plugins).map(async (p) => {
    const logger = log4js.getLogger(`plugin:${p}`);
    await hooks.aCallAll(`init_${p}`, {logger});
  }));
};

export const getPackages = async () => {
  const {linkInstaller} = require("./installer");
  const plugins = await linkInstaller.listPlugins();
  const newDependencies: Record<string, any> = {};

  for (const plugin of plugins) {
    if (!plugin.name.startsWith(prefix)) {
      continue;
    }
    plugin.path = plugin.realPath = plugin.location;
    newDependencies[plugin.name] = plugin;
  }

  newDependencies['ep_etherpad-lite'] = {
    name: 'ep_etherpad-lite',
    version: getEpVersion(),
    path: path.join(settings.root, 'node_modules/ep_etherpad-lite'),
    realPath: path.join(settings.root, 'src'),
  };

  return newDependencies;
};

const loadPlugin = async (packages: Record<string, IPluginInfo & {
  path: string;
}>, pluginName: string, plugins: Record<string, Plugin>, parts: Record<string,  Part>) => {
  const pluginPath = path.resolve(packages[pluginName].path, 'ep.json');
  try {
    const data = await fs.readFile(pluginPath);
    try {
      const plugin = JSON.parse(data.toString());
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

const partsToParentChildList = (parts: Record<string, Part>): [string, string][] => {
  const res: [string, string][] = [];
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
const sortParts = (parts: Record<string, Part>) => tsort(partsToParentChildList(parts))
    .filter((name) => parts[name] !== undefined)
    .map((name) => parts[name]);

export default {
  formatPlugins,
  getPlugins,
  formatParts,
  getParts,
  getHooks,
  formatHooks,
  update,
  getPackages,
  loadPlugin,
  pathNormalization,
  sortParts,
  defs,
  prefix
}
