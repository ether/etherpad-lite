define(["underscore", "async/lib/async"], function (_, async) {
  var exports = {};

  if (typeof(requirejs) == "undefined") {
    if (typeof(window) != "undefined") {
      var requirejs = window.requirejs;
    } else {
      var requirejs = require('requirejs');
    }
  }

  function loadFn(path, hookName, loadModule, cb) {
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

    loadModule(path, function (fn) {
      functionName = functionName ? functionName : hookName;

      _.each(functionName.split("."), function (name) {
        fn = fn[name];
      });
      cb(null, fn);
    });
  };

  function extractHooks(parts, hook_set_name, loadModule, cb) {
    var hooks = {};

    async.each(parts, function (part, cb) {
      if (part[hook_set_name] == undefined) {
        cb(null);
      } else {
        async.each(Object.keys(part[hook_set_name]), function (hook_name, cb) {
          if (hooks[hook_name] === undefined) hooks[hook_name] = [];

          var hook_fn_name = part[hook_set_name][hook_name];

          loadFn(hook_fn_name, hook_name, loadModule, function (err, hook_fn) {
            if (hook_fn) {
              hooks[hook_name].push({"hook_name": hook_name, "hook_fn": hook_fn, "hook_fn_name": hook_fn_name, "part": part});
            } else {
              console.error("Failed to load '" + hook_fn_name + "' for '" + part.full_name + "/" + hook_set_name + "/" + hook_name + ":" + err.toString());
            }
            cb(err);
          });
        }, cb);
      }
    }, function (err) {
      cb(err, hooks);
    });
  };

  exports.extractHooks = extractHooks;

  return exports;
});
