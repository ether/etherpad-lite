var _ = require("underscore");
var defs = require('./plugin_defs');

const disabledHookReasons = {
  hooks: {
    indexCustomInlineScripts: 'The hook makes it impossible to use a Content Security Policy ' +
        'that prohibits inline code. Permitting inline code makes XSS vulnerabilities more likely',
  },
};

function loadFn(path, hookName) {
  var functionName
    , parts = path.split(":");

  // on windows: C:\foo\bar:xyz
  if (parts[0].length == 1) {
    if (parts.length == 3) {
      functionName = parts.pop();
    }
    path = parts.join(":");
  } else {
    path = parts[0];
    functionName = parts[1];
  }

  var fn = require(path);
  functionName = functionName ? functionName : hookName;

  _.each(functionName.split("."), function (name) {
    fn = fn[name];
  });
  return fn;
};

function extractHooks(parts, hook_set_name, normalizer) {
  var hooks = {};
  _.each(parts,function (part) {
    _.chain(part[hook_set_name] || {})
    .keys()
    .each(function (hook_name) {
      var hook_fn_name = part[hook_set_name][hook_name];

      /* On the server side, you can't just
       * require("pluginname/whatever") if the plugin is installed as
       * a dependency of another plugin! Bah, pesky little details of
       * npm... */
      if (normalizer) {
        hook_fn_name = normalizer(part, hook_fn_name, hook_name);
      }

      const disabledReason = (disabledHookReasons[hook_set_name] || {})[hook_name];
      if (disabledReason) {
        console.error(`Hook ${hook_set_name}/${hook_name} is disabled. Reason: ${disabledReason}`);
        console.error(`The hook function ${hook_fn_name} from plugin ${part.name} ` +
                      'will never be called, which may cause the plugin to fail');
        console.error(`Please update the ${part.name} plugin to not use the ${hook_name} hook`);
        return;
      }

      try {
        var hook_fn = loadFn(hook_fn_name, hook_name);
        if (!hook_fn) {
          throw "Not a function";
        }
      } catch (exc) {
        console.error("Failed to load '" + hook_fn_name + "' for '" + part.full_name + "/" + hook_set_name + "/" + hook_name + "': " + exc.toString())
      }
      if (hook_fn) {
        if (hooks[hook_name] == null) hooks[hook_name] = [];
        hooks[hook_name].push({"hook_name": hook_name, "hook_fn": hook_fn, "hook_fn_name": hook_fn_name, "part": part});
      }
    });
  });
  return hooks;
};

exports.extractHooks = extractHooks;

/*
 * Returns an array containing the names of the installed client-side plugins
 *
 * If no client-side plugins are installed, returns an empty array.
 * Duplicate names are always discarded.
 *
 * A client-side plugin is a plugin that implements at least one client_hook
 *
 * EXAMPLE:
 *   No plugins:   []
 *   Some plugins: [ 'ep_adminpads', 'ep_add_buttons', 'ep_activepads' ]
 */
exports.clientPluginNames = function() {
  var client_plugin_names = _.uniq(
    defs.parts
      .filter(function(part) { return part.hasOwnProperty('client_hooks'); })
      .map(function(part) { return 'plugin-' + part['plugin']; })
  );

  return client_plugin_names;
}
