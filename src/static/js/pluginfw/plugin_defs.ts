'use strict';

// This module contains processed plugin definitions. The data structures in this file are set by
// plugins.js (server) or client_plugins.js (client).

// Maps a hook name to a list of hook objects. Each hook object has the following properties:
//   * hook_name: Name of the hook.
//   * hook_fn: Plugin-supplied hook function.
//   * hook_fn_name: Name of the hook function, with the form <filename>:<functionName>.
//   * part: The ep.json part object that declared the hook. See exports.plugins.
export let hooks = {};

// Whether the plugins have been loaded.
export let loaded = false;

// Topologically sorted list of parts from exports.plugins.
export let parts = [];

// Maps the name of a plugin to the plugin's definition provided in ep.json. The ep.json object is
// augmented with additional metadata:
//   * parts: Each part from the ep.json object is augmented with the following properties:
//       - plugin: The name of the plugin.
//       - full_name: Equal to <plugin>/<name>.
//   * package (server-side only): Object containing details about the plugin package:
//       - version
//       - path
//       - realPath
export let plugins = {};

export const setPlugins = (newPlugins) => {
    Object.assign(plugins, newPlugins);
}

export const setParts = (newParts) => {
    Object.assign(parts, newParts);
}

export const setHooks = (newHooks) => {
    Object.assign(hooks, newHooks);
}

export const setLoaded = (newLoaded) => {
    loaded = newLoaded;
}
