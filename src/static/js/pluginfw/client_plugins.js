'use strict';

const pluginUtils = require('./shared');
const defs = require('./plugin_defs');

exports.baseURL = '';

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
