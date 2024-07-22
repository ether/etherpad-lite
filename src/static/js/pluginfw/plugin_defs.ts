'use strict';

// This module contains processed plugin definitions. The data structures in this file are set by
// plugins.js (server) or client_plugins.js (client).

// Maps a hook name to a list of hook objects. Each hook object has the following properties:
//   * hook_name: Name of the hook.
//   * hook_fn: Plugin-supplied hook function.
//   * hook_fn_name: Name of the hook function, with the form <filename>:<functionName>.
//   * part: The ep.json part object that declared the hook. See exports.plugins.

import {MapArrayType} from "../../../node/types/MapType";

class PluginDef {
  private hooks: MapArrayType<PluginHook[]>
  private loaded: boolean
  private parts: MappedPlugin[]
  private plugins: MapArrayType<any>

  constructor() {
    this.hooks = {}
    this.loaded = false
    // Topologically sorted list of parts from exports.plugins.
    this.parts = []
    // Maps the name of a plugin to the plugin's definition provided in ep.json. The ep.json object is
// augmented with additional metadata:
//   * parts: Each part from the ep.json object is augmented with the following properties:
//       - plugin: The name of the plugin.
//       - full_name: Equal to <plugin>/<name>.
//   * package (server-side only): Object containing details about the plugin package:
//       - version
//       - path
//       - realPath
    this.plugins = {}
  }

  getHooks() {
    return this.hooks
  }

  isLoaded() {
    return this.loaded
  }

  getParts() {
    return this.parts
  }

  getPlugins() {
    return this.plugins
  }
  setHooks(hooks: MapArrayType<PluginHook[]>) {
    this.hooks = hooks
  }
  setLoaded(loaded: boolean) {
    this.loaded = loaded
  }
  setParts(parts: any[]) {
    this.parts = parts
  }
  setPlugins(plugins: MapArrayType<any>) {
    this.plugins = plugins
  }
}

export type PluginResp = {
  plugins: MapArrayType<Plugin>
  parts:  MappedPlugin[]
}


export type MappedPlugin = Part& {
  plugin: string
  full_name: string
}

export type Plugin = {
  parts: Part[]
}


export type Part = {
  name: string,
  client_hooks: MapArrayType<string>,
  hooks: MapArrayType<string>
  pre?: string[]
  post?: string[]
  plugin?: string
}

export type PluginHook = {
  hook_name: string
  hook_fn: Function
  hook_fn_name: string
  part: Part
}

export const pluginDefs = new PluginDef()
