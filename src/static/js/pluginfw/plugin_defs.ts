// This module contains processed plugin definitions. The data structures in this file are set by
// plugins.js (server) or client_plugins.js (client).

// Maps a hook name to a list of hook objects. Each hook object has the following properties:
//   * hook_name: Name of the hook.
//   * hook_fn: Plugin-supplied hook function.
//   * hook_fn_name: Name of the hook function, with the form <filename>:<functionName>.
//   * part: The ep.json part object that declared the hook. See exports.plugins.
import {Part} from "../types/SocketIOMessage";
import {MapArrayType} from "../../../node/types/MapType";

export const hooks = {};

// Whether the plugins have been loaded.
export let loaded = false;

// Topologically sorted list of parts from exports.plugins.
export const parts: Part[] = [];

// Maps the name of a plugin to the plugin's definition provided in ep.json. The ep.json object is
// augmented with additional metadata:
//   * parts: Each part from the ep.json object is augmented with the following properties:
//       - plugin: The name of the plugin.
//       - full_name: Equal to <plugin>/<name>.
//   * package (server-side only): Object containing details about the plugin package:
//       - version
//       - path
//       - realPath

type PluginDefinition = {
  package: {
    name: string,
    version: string,
    realPath: string,
    path: string,
    updatable?: boolean
  }
}

export const plugins: Record<string, PluginDefinition> = {};

export const setLoaded = (value: boolean) => {
  loaded = value;
}

export const setParts = (value: any) => {
  parts.push(value);
}

export const setPlugins = (value: any) => {

}

export default {
  hooks,
  loaded,
  parts,
  plugins,
  setLoaded,
  setParts,
  setPlugins,
}
