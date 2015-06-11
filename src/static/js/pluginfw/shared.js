var _ = require("underscore");

// @NOTE browserify does not insert globals unless I figure how to expose the module
//var isBrowser = process.title === 'browser';

function loadFn(pathNorm, hookName) {
  var path = pathNorm;
  // if (isBrowser) {
  //   var path = '../../../node_modules/' + pathNorm;

  // }
  console.log('pluginfw/shared', path, require);
  var functionName,
    parts = path.split(":");

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
  // var rq=require;
  // if (window.process && process.browser===true) {
  //   rq = window.require;
  // }
  // var fn = rq(path);
  
    var fn = require(path);

  functionName = functionName ? functionName : hookName;

  _.each(functionName.split("."), function(name) {
    fn = fn[name];
  });

if (isBrowser) {
// debugger;
  }

  
  return fn;
}
;

function extractHooks(parts, hook_set_name, normalizer) {
  var hooks = {};
  _.each(parts, function(part) {
    _.chain(part[hook_set_name] || {})
      .keys()
      .each(function(hook_name) {
        if (hooks[hook_name] === undefined)
          hooks[hook_name] = [];

        var hook_fn_name = part[hook_set_name][hook_name];

        /* On the server side, you can't just
         * require("pluginname/whatever") if the plugin is installed as
         * a dependency of another plugin! Bah, pesky little details of
         * npm... */
        if (normalizer) {
          hook_fn_name = normalizer(part, hook_fn_name);
        }

        try {
          var hook_fn = loadFn(hook_fn_name, hook_name);
          if (!hook_fn) {
            throw "Not a function";
          }
        } catch (exc) {
          console.error("Failed to load '" + hook_fn_name + "' for '" + part.full_name + "/" + hook_set_name + "/" + hook_name + "': " + exc.toString())
          // throw "Not a function";
        }
        if (hook_fn) {
          hooks[hook_name].push({
            "hook_name": hook_name,
            "hook_fn": hook_fn,
            "hook_fn_name": hook_fn_name,
            "part": part
          });
        }
      });
  });
  return hooks;
}
;

exports.extractHooks = extractHooks;