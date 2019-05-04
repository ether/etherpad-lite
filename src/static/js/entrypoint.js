var clientVars = {};
(function () {
  var pathComponents = location.pathname.split('/');

  // Strip 'p' and the padname from the pathname and set as baseURL
  var baseURL = pathComponents.slice(0,pathComponents.length-2).join('/') + '/';

  $ = jQuery = require('ep_etherpad-lite/static/js/rjquery').jQuery; // Expose jQuery #HACK
  browser = require('ep_etherpad-lite/static/js/browser');

  var plugins = require('ep_etherpad-lite/static/js/pluginfw/client_plugins');
  var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');

  plugins.baseURL = baseURL;
  plugins.update(function () {
    hooks.plugins = plugins;

    // Call documentReady hook
    $(function() {
      hooks.aCallAll('documentReady');
    });

    var pad = require('ep_etherpad-lite/static/js/pad');
    pad.baseURL = baseURL;
    pad.init();
  });

  /* TODO: These globals shouldn't exist. */
  pad = require('ep_etherpad-lite/static/js/pad').pad;
  chat = require('ep_etherpad-lite/static/js/chat').chat;
  padeditbar = require('ep_etherpad-lite/static/js/pad_editbar').padeditbar;
  padimpexp = require('ep_etherpad-lite/static/js/pad_impexp').padimpexp;
}());
