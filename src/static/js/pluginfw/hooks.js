var async = require("async");
var _ = require("underscore");

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
  if (exports.plugins){
    if (exports.plugins.hooks[hook_name] === undefined) return [];
    return _.flatten(_.map(exports.plugins.hooks[hook_name], function (hook) {
      return hookCallWrapper(hook, hook_name, args);
    }), true);
  }
}

exports.aCallAll = function (hook_name, args, cb) {
  if (!args) args = {};
  if (!cb) cb = function () {};
  if (exports.plugins.hooks[hook_name] === undefined) return cb(null, []);
  async.map(
    exports.plugins.hooks[hook_name],
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
  if (exports.plugins.hooks[hook_name] === undefined) return [];
  return exports.syncMapFirst(exports.plugins.hooks[hook_name], function (hook) {
    return hookCallWrapper(hook, hook_name, args);
  });
}

exports.aCallFirst = function (hook_name, args, cb) {
  if (!args) args = {};
  if (!cb) cb = function () {};
  if (exports.plugins.hooks[hook_name] === undefined) return cb(null, []);
  exports.mapFirst(
    exports.plugins.hooks[hook_name],
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
