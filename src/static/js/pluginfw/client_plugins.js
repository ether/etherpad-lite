'use strict';

const pluginUtils = require('./shared');
const defs = require('./plugin_defs');

exports.baseURL = '';

exports.ensure = (cb) => !defs.loaded ? exports.update(cb) : cb();

exports.update = (cb) => {
  // It appears that this response (see #620) may interrupt the current thread
  // of execution on Firefox. This schedules the response in the run-loop,
  // which appears to fix the issue.
  const callback = () => setTimeout(cb, 0);

  jQuery.getJSON(
      `${exports.baseURL}pluginfw/plugin-definitions.json?v=${clientVars.randomVersionString}`
  ).done((data) => {
    defs.plugins = data.plugins;
    defs.parts = data.parts;
    defs.hooks = pluginUtils.extractHooks(defs.parts, 'client_hooks');
    defs.loaded = true;
    callback();
  }).fail((err) => {
    console.error(`Failed to load plugin-definitions: ${err}`);
    callback();
  });
};

const adoptPluginsFromAncestorsOf = (frame) => {
  // Bind plugins with parent;
  let parentRequire = null;
  try {
    while ((frame = frame.parent)) {
      if (typeof (frame.require) !== 'undefined') {
        parentRequire = frame.require;
        break;
      }
    }
  } catch (error) {
    // Silence (this can only be a XDomain issue).
    console.error(error);
  }

  if (!parentRequire) throw new Error('Parent plugins could not be found.');

  const ancestorPluginDefs = parentRequire('ep_etherpad-lite/static/js/pluginfw/plugin_defs');
  defs.hooks = ancestorPluginDefs.hooks;
  defs.loaded = ancestorPluginDefs.loaded;
  defs.parts = ancestorPluginDefs.parts;
  defs.plugins = ancestorPluginDefs.plugins;
  const ancestorPlugins = parentRequire('ep_etherpad-lite/static/js/pluginfw/client_plugins');
  exports.baseURL = ancestorPlugins.baseURL;
  exports.ensure = ancestorPlugins.ensure;
  exports.update = ancestorPlugins.update;
};

exports.adoptPluginsFromAncestorsOf = adoptPluginsFromAncestorsOf;
