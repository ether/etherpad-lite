'use strict';

import {promises as fs} from "fs";

import {aCallAll} from "./hooks";

import log4js from "log4js";

import path from "path";

import {exportCMD} from "../../../node/utils/run_cmd";

import {tsort} from "./tsort";

import {extractHooks} from "./shared";

import {loaded, parts, plugins, setHooks, setLoaded, setParts, setPlugins} from "./plugin_defs";
import {PluginInfo} from "../../module/PluginInfo";

const logger = log4js.getLogger('plugins');

// Log the version of npm at startup.
(async () => {
  try {
    const version = await exportCMD(['npm', '--version'], {stdio: [null, 'string']});
    logger.info(`npm --version: ${version}`);
  } catch (err) {
    logger.error(`Failed to get npm version: ${err.stack || err}`);
    // This isn't a fatal error so don't re-throw.
  }
})();

type PartType = {
  [keys: string]:any
}
export const prefix = 'ep_';

export const formatPlugins = () => Object.keys(plugins).join(', ');

export const formatParts = () => parts.map((part) => part.full_name).join('\n');

export const formatHooks = (hookSetName, html) => {
  let hooks = new Map();
  for (const [pluginName, def] of Object.entries(plugins)) {
    for (const part of parts) {
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
  const lines = [];
  const sortStringKeys = (a, b) => String(a[0]).localeCompare(b[0]);
  if (html) lines.push('<dl>');
  hooks = new Map([...hooks].sort(sortStringKeys));
  for (const [hookName, hookEntry] of hooks) {
    lines.push(html ? `  <dt>${hookName}:</dt><dd><dl>` : `  ${hookName}:`);
    const sortedHookEntry = new Map<any,any>([...hookEntry].sort(sortStringKeys));
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

export const pathNormalization = (part, hookFnName, hookName) => {
  const tmp = hookFnName.split(':'); // hookFnName might be something like 'C:\\foo.js:myFunc'.
  // If there is a single colon assume it's 'filename:funcname' not 'C:\\filename'.
  const functionName = (tmp.length > 1 ? tmp.pop() : null) || hookName;
  const moduleName = tmp.join(':') || part.plugin;
  const packageDir = path.dirname(plugins[part.plugin].package.path);
  const fileName = path.join(packageDir, moduleName);
  return `${fileName}:${functionName}`;
};

export const update = async () => {
  const packages = await exports.getPackages();
  let parts:{[keys: string]:any} = {}; // Key is full name. sortParts converts this into a topologically sorted array.
  let plugins = {};

  // Load plugin metadata ep.json
  await Promise.all(Object.keys(packages).map(async (pluginName) => {
    logger.info(`Loading plugin ${pluginName}...`);
    await loadPlugin(packages, pluginName, plugins, parts);
  }));
  logger.info(`Loaded ${Object.keys(packages).length} plugins`);

  setPlugins(plugins);
  setParts(sortParts(parts))
  setHooks(extractHooks(parts, 'hooks', exports.pathNormalization));
  setLoaded(true)
  await Promise.all(Object.keys(plugins).map(async (p) => {
    const logger = log4js.getLogger(`plugin:${p}`);
    await aCallAll(`init_${p}`, {logger});
  }));
};

exports.getPackages = async () => {
  logger.info('Running npm to get a list of installed plugins...');
  // Notes:
  //   * Do not pass `--prod` otherwise `npm ls` will fail if there is no `package.json`.
  //   * The `--no-production` flag is required (or the `NODE_ENV` environment variable must be
  //     unset or set to `development`) because otherwise `npm ls` will not mention any packages
  //     that are not included in `package.json` (which is expected to not exist).
  const cmd = ['npm', 'ls', '--long', '--json', '--depth=0', '--no-production'];
  const {dependencies = {}} = JSON.parse(await exportCMD(cmd, {stdio: [null, 'string']}) as unknown as string);
  await Promise.all(Object.entries(dependencies).map(async ([pkg, info]) => {
    if (!pkg.startsWith(exports.prefix)) {
      delete dependencies[pkg];
      return;
    }
    const mappedInfo = info as PluginInfo

    mappedInfo.realPath = await fs.realpath(mappedInfo.path);
  }));
  return dependencies;
};

const loadPlugin = async (packages, pluginName, plugins, parts) => {
  const pluginPath = path.resolve(packages[pluginName].path, 'ep.json');
  try {
    const data = await fs.readFile(pluginPath, "utf8");
    try {
      const plugin = JSON.parse(data);
      plugin.package = packages[pluginName];
      plugins[pluginName] = plugin;
      for (const part of plugin.parts) {
        part.plugin = pluginName;
        part.full_name = `${pluginName}/${part.name}`;
        parts[part.full_name] = part;
      }
    } catch (err) {
      logger.error(`Unable to parse plugin definition file ${pluginPath}: ${err.stack || err}`);
    }
  } catch (err) {
    logger.error(`Unable to load plugin definition file ${pluginPath}: ${err.stack || err}`);
  }
};

const partsToParentChildList = (parts) => {
  const res:(string|number)[][] = [];
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
//FIXME Is this better
const sortParts = (parts:PartType) => tsort(partsToParentChildList(parts))
    .filter((name) => name !== undefined)
    .map((name) => name);
