var _ = require("underscore");
var pluginDefs = require('./plugin_defs');

// Maps the name of a server-side hook to a string explaining the deprecation
// (e.g., 'use the foo hook instead').
//
// If you want to deprecate the fooBar hook, do the following:
//
//     const hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');
//     hooks.deprecationNotices.fooBar = 'use the newSpiffy hook instead';
//
exports.deprecationNotices = {};

const deprecationWarned = {};

function checkDeprecation(hook) {
  const notice = exports.deprecationNotices[hook.hook_name];
  if (notice == null) return;
  if (deprecationWarned[hook.hook_fn_name]) return;
  console.warn('%s hook used by the %s plugin (%s) is deprecated: %s',
      hook.hook_name, hook.part.name, hook.hook_fn_name, notice);
  deprecationWarned[hook.hook_fn_name] = true;
}

exports.bubbleExceptions = true

var hookCallWrapper = function (hook, hook_name, args, cb) {
  if (cb === undefined) cb = function (x) { return x; };

  checkDeprecation(hook);

  // Normalize output to list for both sync and async cases
  var normalize = function(x) {
    if (x === undefined) return [];
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
  return [];
}

exports.mapFirst = function (lst, fn, cb, predicate) {
  if (predicate == null) predicate = (x) => (x != null && x.length > 0);
  var i = 0;

  var next = function () {
    if (i >= lst.length) return cb(null, []);
    fn(lst[i++], function (err, result) {
      if (err) return cb(err);
      if (predicate(result)) return cb(null, result);
      next();
    });
  }
  next();
}

exports.callAll = function (hook_name, args) {
  if (!args) args = {};
  if (pluginDefs.hooks[hook_name] === undefined) return [];
  return _.flatten(_.map(pluginDefs.hooks[hook_name], function(hook) {
    return hookCallWrapper(hook, hook_name, args);
  }), true);
}

async function aCallAll(hook_name, args, cb) {
  if (!args) args = {};
  if (!cb) cb = function () {};
  if (pluginDefs.hooks[hook_name] === undefined) return cb(null, []);

  var hooksPromises = pluginDefs.hooks[hook_name].map(async function(hook, index) {
    return await hookCallWrapper(hook, hook_name, args, function (res) {
      return Promise.resolve(res);
    });
  });

  var result = await Promise.all(hooksPromises);

  // after forEach
  cb(null, _.flatten(result, true));
}

/* return a Promise if cb is not supplied */
exports.aCallAll = function (hook_name, args, cb) {
  if (cb === undefined) {
    try{
      return new Promise(function(resolve, reject) {
        aCallAll(hook_name, args, function(err, res) {
  	      return err ? reject(err) : resolve(res);
        });
      });
    }catch(e){
      $.gritter.removeAll();
      $.gritter.add("Please update your web browser")
    }
  } else {
    return aCallAll(hook_name, args, cb);
  }
}

exports.callFirst = function (hook_name, args) {
  if (!args) args = {};
  if (pluginDefs.hooks[hook_name] === undefined) return [];
  return exports.syncMapFirst(pluginDefs.hooks[hook_name], function(hook) {
    return hookCallWrapper(hook, hook_name, args);
  });
}

function aCallFirst(hook_name, args, cb, predicate) {
  if (!args) args = {};
  if (!cb) cb = function () {};
  if (pluginDefs.hooks[hook_name] === undefined) return cb(null, []);
  exports.mapFirst(
    pluginDefs.hooks[hook_name],
    function (hook, cb) {
      hookCallWrapper(hook, hook_name, args, function (res) { cb(null, res); });
    },
    cb,
    predicate
  );
}

/* return a Promise if cb is not supplied */
exports.aCallFirst = function (hook_name, args, cb, predicate) {
  if (cb === undefined) {
    return new Promise(function(resolve, reject) {
      aCallFirst(hook_name, args, function(err, res) {
	return err ? reject(err) : resolve(res);
      }, predicate);
    });
  } else {
    return aCallFirst(hook_name, args, cb, predicate);
  }
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
