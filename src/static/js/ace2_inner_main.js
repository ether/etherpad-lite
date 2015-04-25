var pathComponents = parent.parent.location.pathname.split("/");
var baseURL = pathComponents.slice(0,pathComponents.length-2).join("/") + "/";
requirejs.config({
  baseUrl: baseURL + "static/plugins",
  paths: {underscore: baseURL + "static/plugins/underscore/underscore"}
});

requirejs(
  [
    "ep_etherpad-lite/static/js/rjquery",
    "ep_etherpad-lite/static/js/pluginfw/client_plugins",
    "ep_etherpad-lite/static/js/pluginfw/hooks",
    "ep_etherpad-lite/static/js/ace2_inner"
  ],
  function (j, plugins, hooks, Ace2Inner) {
    jQuery = $ = window.jQuery = window.$ = j; // Expose jQuery #HACK

    plugins.adoptPluginsFromAncestorsOf(window, function () {
      hooks.plugins = plugins;

      plugins.ensure(function () {
        Ace2Inner.init();
      });
    });
  }
);
