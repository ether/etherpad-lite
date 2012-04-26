var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
var _;

/* FIXME: Ugly hack, in the future, use same code for server & client */
if (plugins.isClient) {
  var async = require("ep_etherpad-lite/static/js/pluginfw/async");  
  var _ = require("ep_etherpad-lite/static/js/underscore");
} else {
  var async = require("async");
  var _ = require("underscore");
}

exports.bubbleExceptions = true

var hookCallWrapper = function (hook, hook_name, args, cb) {
  if (cb === undefined) cb = function (x) { return x; };

  // Normalize output to list for both sync and async cases
  var normalize = function(x) {
    if (x == undefined) return [];
    return x;
  }
  var normalizedhook = function () {
    return normalize(hook.hook_fn(hook_name, args, function (x) {
      return cb(normalize(x));
    }));
  }

  if (exports.bubbleExceptions) {
      return normalizedhook();
  } else {
    try {
      return normalizedhook();
    } catch (ex) {
      console.error([hook_name, hook.part.full_name, ex.stack || ex]);
    }
  }
}

exports.syncMapFirst = function (lst, fn) {
  var i;
  var result;
  for (i = 0; i < lst.length; i++) {
    result = fn(lst[i])
    if (result.length) return result;
  }
  return undefined;
}

exports.mapFirst = function (lst, fn, cb) {
  var i = 0;

  next = function () {
    if (i >= lst.length) return cb(undefined);
    fn(lst[i++], function (err, result) {
      if (err) return cb(err);
      if (result.length) return cb(null, result);
      next();
    });
  }
  next();
}


/*
  Returns all registered callbacks of a hook
  @param string hook_name the hook to retrieve the callbacks for.
  @return an array of callback functions, an empty array if no callbacks are registered
*/
exports.registeredCallbacks = function (hook_name){
  console.log(plugins.hooks[hook_name])
  return (plugins.hooks[hook_name] !== undefined) ? plugins.hooks[hook_name] : [];
}

exports.callAll = function (hook_name, args) {
  if (!args) args = {};
  var callbacks = exports.registeredCallbacks(hook_name);
  
  return _.flatten(
    _.map(callbacks, function (hook) {
      return hookCallWrapper(hook, hook_name, args);
    }), true);
}

exports.aCallAll = function (hook_name, args, cb) {
  if (!args) args = {};
  if (!cb) cb = function () {};
  var callbacks = exports.registeredCallbacks(hook_name);
  
  async.map(
    callbacks,
    function (hook, cb) {
      hookCallWrapper(hook, hook_name, args, function (res) { cb(null, res); });
    },
    function (err, res) {
        cb(null, _.flatten(res, true));
    }
  );
}

exports.callFirst = function (hook_name, args) {
  if (!args) args = {};
  var callbacks = exports.registeredCallbacks(hook_name);
  
  return exports.syncMapFirst(callbacks, function (hook) {
    var res = hookCallWrapper(hook, hook_name, args);
    return res !== undefined ? res : [];
  });
}

exports.aCallFirst = function (hook_name, args, cb) {
  if (!args) args = {};
  if (!cb) cb = function () {};
  var callbacks = exports.registeredCallbacks(hook_name);
  
  exports.mapFirst(
    callbacks,
    function (hook, cb) {
      hookCallWrapper(hook, hook_name, args, function (res) { cb(null, res); });
    },
    cb
  );
}

exports.callAllStr = function(hook_name, args, sep, pre, post) {
  if (sep == undefined) sep = '';
  if (pre == undefined) pre = '';
  if (post == undefined) post = '';
  var newCallhooks = [];
  var callhooks = exports.callAll(hook_name, args);
  for (var i = 0, ii = callhooks.length; i < ii; i++) {
    newCallhooks[i] = pre + callhooks[i] + post;
  }
  return newCallhooks.join(sep || "");
}
