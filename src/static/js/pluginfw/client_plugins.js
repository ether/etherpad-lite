'use strict';

const pluginUtils = require('./shared');
const defs = require('./plugin_defs');

exports.baseURL = '';

exports.update = async (modules) => {
  const data = await jQuery.getJSON(
      `${exports.baseURL}pluginfw/plugin-definitions.json?v=${clientVars.randomVersionString}`);
  defs.plugins = data.plugins;
  defs.parts = data.parts;
  defs.hooks = pluginUtils.extractHooks(defs.parts, 'client_hooks', null, modules);
  defs.loaded = true;
};
