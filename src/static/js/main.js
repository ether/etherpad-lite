var clientVars = {};
(function () {
  var pathComponents = location.pathname.split('/');

  // Strip 'p' and the padname from the pathname and set as baseURL
  var baseURL = pathComponents.slice(0,pathComponents.length-2).join('/') + '/';

  require.setRootURI(baseURL + "javascripts/src");
  require.setLibraryURI(baseURL + "javascripts/lib");
  require.setGlobalKeyPath("require");

  window.requireKernel = require;

  requirejs.config({
     baseUrl: baseURL + "static/plugins",
     paths: {'underscore': baseURL + "static/plugins/underscore/underscore"},
  });

  requirejs(
    [
      'ep_etherpad-lite/static/js/rjquery',
      'ep_etherpad-lite/static/js/pluginfw/client_plugins',
      'ep_etherpad-lite/static/js/pluginfw/hooks'
    ], function ($, plugins, hooks) {
console.log("hooks & plugins modules loaded");
      window.$ = $; // Expose jQuery #HACK
      window.jQuery = $;

      browser = require('ep_etherpad-lite/static/js/browser').browser;
      if ((!browser.msie) && (!(browser.mozilla && browser.version.indexOf("1.8.") == 0))) {
        document.domain = document.domain; // for comet
      }

      plugins.baseURL = baseURL;
      plugins.update(function () {
        hooks.plugins = plugins;

console.log("hooks.plugins initialized");

        // Call documentReady hook
        $(function() {
          hooks.aCallAll('documentReady');
        });

        requirejs(
          [
            'ep_etherpad-lite/static/js/pad',
            'ep_etherpad-lite/static/js/chat',
            'ep_etherpad-lite/static/js/pad_editbar',
          ], function (padMod, chatMod, padEditbarMod) {
console.log("pad loaded");

            padMod.baseURL = baseURL;
            padMod.init();

            /* TODO: These globals shouldn't exist. */
            pad = padMod.pad;
            chat = chatMod.chat;
            padeditbar = padEditbarMod.padeditbar;
            padimpexp = window.requireKernel('ep_etherpad-lite/static/js/pad_impexp').padimpexp;
          }
        );
      });
    }
  );
}());
