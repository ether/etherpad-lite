'use strict';

import {pluginDefs, PluginResp} from './plugin_defs'
import {extractHooks} from "./shared";

export const baseURL = '';

export const ensure = (cb: Function) => !pluginDefs.isLoaded() ? update(cb) : cb();

export const update = async (modules: Function) => {
  const data = await jQuery.getJSON(
    `${baseURL}pluginfw/plugin-definitions.json?v=${window.clientVars.randomVersionString}`) as PluginResp;
  pluginDefs.setParts(data.parts)
  pluginDefs.setPlugins(data.plugins)
  const hooks = extractHooks(pluginDefs.getParts(), 'client_hooks', null, modules)!
  pluginDefs.setHooks(hooks)
  pluginDefs.setLoaded(true)
};
