var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
var _;

/* FIXME: Ugly hack, in the future, use same code for server & client */
if (plugins.isClient) {
  var async = require("ep_etherpad-lite/static/js/pluginfw/async");  
  _ = require("ep_etherpad-lite/static/js/underscore");
} else {
  var async = require("async");
  _ = require("underscore");
}

exports.bubbleExceptions = true

var hookCallWrapper = function (hook, hook_name, args, cb) {
  if (cb === undefined) cb = function (x) { return x; };
  if (exports.bubbleExceptions) {
    return hook.hook_fn(hook_name, args, cb);
  } else {
    try {
      return hook.hook_fn(hook_name, args, cb);
    } catch (ex) {
      console.error([hook_name, hook.part.full_name, ex.stack || ex]);
    }
  }
}


/* Don't use Array.concat as it flatterns arrays within the array */
exports.flatten = function (lst) {
  var res = [];
  if (lst != undefined && lst != null) {
    for (var i = 0; i < lst.length; i++) {
      if (lst[i] != undefined && lst[i] != null) {
        for (var j = 0; j < lst[i].length; j++) {
          res.push(lst[i][j]);
	}
      }
    }
  }
  return res;
}

exports.callAll = function (hook_name, args) {
  if (!args) args = {};
  if (plugins.hooks[hook_name] === undefined) return [];
  return exports.flatten(_.map(plugins.hooks[hook_name], function (hook) {
    return hookCallWrapper(hook, hook_name, args);
  }));
}

exports.aCallAll = function (hook_name, args, cb) {
  if (!args) args = {};
  if (!cb) cb = function () {};
  if (plugins.hooks[hook_name] === undefined) return cb(null, []);
  async.map(
    plugins.hooks[hook_name],
    function (hook, cb) {
      hookCallWrapper(hook, hook_name, args, function (res) { cb(null, res); });
    },
    function (err, res) {
      cb(null, exports.flatten(res));
    }
  );
}

exports.callFirst = function (hook_name, args) {
  if (!args) args = {};
  if (plugins.hooks[hook_name][0] === undefined) return [];
  return exports.flatten(hookCallWrapper(plugins.hooks[hook_name][0], hook_name, args));
}

exports.aCallFirst = function (hook_name, args, cb) {
  if (!args) args = {};
  if (!cb) cb = function () {};
  if (plugins.hooks[hook_name][0] === undefined) return cb(null, []);
    hookCallWrapper(plugins.hooks[hook_name][0], hook_name, args, function (res) { cb(null, exports.flatten(res)); });
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
