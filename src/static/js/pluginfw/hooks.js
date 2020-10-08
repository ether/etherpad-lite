/* global exports, require */

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
  console.warn(`${hook.hook_name} hook used by the ${hook.part.name} plugin ` +
               `(${hook.hook_fn_name}) is deprecated: ${notice}`);
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

// Calls the hook function synchronously and returns the value provided by the hook function (via
// callback or return value).
//
// A synchronous hook function can provide a value in these ways:
//
//   * Call the callback, passing the desired value (which may be `undefined`) directly as the first
//     argument, then return `undefined`.
//   * For hook functions with three (or more) parameters: Directly return the desired value, which
//     must not be `undefined`. Note: If a three-parameter hook function directly returns
//     `undefined` and it has not already called the callback then it is indicating that it is not
//     yet done and will eventually call the callback. This behavior is not supported by synchronous
//     hooks.
//   * For hook functions with two (or fewer) parameters: Directly return the desired value (which
//     may be `undefined`).
//
// The callback passed to a hook function is guaranteed to return `undefined`, so it is safe for
// hook functions to do `return cb(value);`.
//
// A hook function can signal an error by throwing.
//
// A hook function settles when it provides a value (via callback or return) or throws. If a hook
// function attempts to settle again (e.g., call the callback again, or call the callback and also
// return a value) then the second attempt has no effect except either an error message is logged or
// there will be an unhandled promise rejection depending on whether the the subsequent attempt is a
// duplicate (same value or error) or different, respectively.
//
// See the tests in tests/backend/specs/hooks.js for examples of supported and prohibited behaviors.
//
function callHookFnSync(hook, context) {
  checkDeprecation(hook);

  // This var is used to keep track of whether the hook function already settled.
  let outcome;

  // This is used to prevent recursion.
  let doubleSettleErr;

  const settle = (err, val, how) => {
    doubleSettleErr = null;
    const state = err == null ? 'resolved' : 'rejected';
    if (outcome != null) {
      // It was already settled, which indicates a bug.
      const action = err == null ? 'resolve' : 'reject';
      const msg = (`DOUBLE SETTLE BUG IN HOOK FUNCTION (plugin: ${hook.part.name}, ` +
                   `function name: ${hook.hook_fn_name}, hook: ${hook.hook_name}): ` +
                   `Attempt to ${action} via ${how} but it already ${outcome.state} ` +
                   `via ${outcome.how}. Ignoring this attempt to ${action}.`);
      console.error(msg);
      if (state !== outcome.state || (err == null ? val !== outcome.val : err !== outcome.err)) {
        // The second settle attempt differs from the first, which might indicate a serious bug.
        doubleSettleErr = new Error(msg);
        throw doubleSettleErr;
      }
      return;
    }
    outcome = {state, err, val, how};
    if (val && typeof val.then === 'function') {
      console.error(`PROHIBITED PROMISE BUG IN HOOK FUNCTION (plugin: ${hook.part.name}, ` +
                    `function name: ${hook.hook_fn_name}, hook: ${hook.hook_name}): ` +
                    'The hook function provided a "thenable" (e.g., a Promise) which is ' +
                    'prohibited because the hook expects to get the value synchronously.');
    }
  };

  // IMPORTANT: This callback must return `undefined` so that a hook function can safely do
  // `return callback(value);` for backwards compatibility.
  const callback = (ret) => {
    settle(null, ret, 'callback');
  };

  let val;
  try {
    val = hook.hook_fn(hook.hook_name, context, callback);
  } catch (err) {
    if (err === doubleSettleErr) throw err; // Avoid recursion.
    try {
      settle(err, null, 'thrown exception');
    } catch (doubleSettleErr) {
      // Schedule the throw of the double settle error on the event loop via
      // Promise.resolve().then() (which will result in an unhandled Promise rejection) so that the
      // original error is the error that is seen by the caller. Fixing the original error will
      // likely fix the double settle bug, so the original error should get priority.
      Promise.resolve().then(() => { throw doubleSettleErr; });
    }
    throw err;
  }

  // IMPORTANT: This MUST check for undefined -- not nullish -- because some hooks intentionally use
  // null as a special value.
  if (val === undefined) {
    if (outcome != null) return outcome.val; // Already settled via callback.
    if (hook.hook_fn.length >= 3) {
      console.error(`UNSETTLED FUNCTION BUG IN HOOK FUNCTION (plugin: ${hook.part.name}, ` +
                    `function name: ${hook.hook_fn_name}, hook: ${hook.hook_name}): ` +
                    'The hook function neither called the callback nor returned a non-undefined ' +
                    'value. This is prohibited because it will result in freezes when a future ' +
                    'version of Etherpad updates the hook to support asynchronous behavior.');
    } else {
      // The hook function is assumed to not have a callback parameter, so fall through and accept
      // `undefined` as the resolved value.
      //
      // IMPORTANT: "Rest" parameters and default parameters are not counted in`Function.length`, so
      // the assumption does not hold for wrappers like `(...args) => { real(...args); }`. Such
      // functions will still work properly without any logged warnings or errors for now, but:
      //   * Once the hook is upgraded to support asynchronous hook functions, calling the callback
      //     will (eventually) cause a double settle error, and the function might prematurely
      //     resolve to `undefined` instead of the desired value.
      //   * The above "unsettled function" warning is not logged if the function fails to call the
      //     callback like it is supposed to.
    }
  }

  settle(null, val, 'returned value');
  return outcome.val;
}

// Invokes all registered hook functions synchronously.
//
// Arguments:
//   * hookName: Name of the hook to invoke.
//   * context: Passed unmodified to the hook functions, except nullish becomes {}.
//
// Return value:
//   A flattened array of hook results. Specifically, it is equivalent to doing the following:
//     1. Collect all values returned by the hook functions into an array.
//     2. Convert each `undefined` entry into `[]`.
//     3. Flatten one level.
exports.callAll = function (hookName, context) {
  if (context == null) context = {};
  const hooks = pluginDefs.hooks[hookName] || [];
  return _.flatten(hooks.map((hook) => {
    const ret = callHookFnSync(hook, context);
    // `undefined` (but not `null`!) is treated the same as [].
    if (ret === undefined) return [];
    return ret;
  }), 1);
};

// Calls the hook function asynchronously and returns a Promise that either resolves to the hook
// function's provided value or rejects with an error generated by the hook function.
//
// An asynchronous hook function can provide a value in these ways:
//
//   * Call the callback, passing a Promise (or thenable) that resolves to the desired value (which
//     may be `undefined`) as the first argument.
//   * Call the callback, passing the desired value (which may be `undefined`) directly as the first
//     argument.
//   * Return a Promise (or thenable) that resolves to the desired value (which may be `undefined`).
//   * For hook functions with three (or more) parameters: Directly return the desired value, which
//     must not be `undefined`. Note: If a hook function directly returns `undefined` and it has not
//     already called the callback then it is indicating that it is not yet done and will eventually
//     call the callback.
//   * For hook functions with two (or fewer) parameters: Directly return the desired value (which
//     may be `undefined`).
//
// The callback passed to a hook function is guaranteed to return `undefined`, so it is safe for
// hook functions to do `return cb(valueOrPromise);`.
//
// A hook function can signal an error in these ways:
//
//   * Throw.
//   * Return a Promise that rejects.
//   * Pass a Promise that rejects as the first argument to the provided callback.
//
// A hook function settles when it directly provides a value, when it throws, or when the Promise it
// provides settles (resolves or rejects). If a hook function attempts to settle again (e.g., call
// the callback again, or return a value and also call the callback) then the second attempt has no
// effect except either an error message is logged or an Error object is thrown depending on whether
// the the subsequent attempt is a duplicate (same value or error) or different, respectively.
//
// See the tests in tests/backend/specs/hooks.js for examples of supported and prohibited behaviors.
//
async function callHookFnAsync(hook, context) {
  checkDeprecation(hook);
  return await new Promise((resolve, reject) => {
    // This var is used to keep track of whether the hook function already settled.
    let outcome;

    const settle = (err, val, how) => {
      const state = err == null ? 'resolved' : 'rejected';
      if (outcome != null) {
        // It was already settled, which indicates a bug.
        const action = err == null ? 'resolve' : 'reject';
        const msg = (`DOUBLE SETTLE BUG IN HOOK FUNCTION (plugin: ${hook.part.name}, ` +
                     `function name: ${hook.hook_fn_name}, hook: ${hook.hook_name}): ` +
                     `Attempt to ${action} via ${how} but it already ${outcome.state} ` +
                     `via ${outcome.how}. Ignoring this attempt to ${action}.`);
        console.error(msg);
        if (state !== outcome.state || (err == null ? val !== outcome.val : err !== outcome.err)) {
          // The second settle attempt differs from the first, which might indicate a serious bug.
          throw new Error(msg);
        }
        return;
      }
      outcome = {state, err, val, how};
      if (err == null) { resolve(val); } else { reject(err); }
    };

    // IMPORTANT: This callback must return `undefined` so that a hook function can safely do
    // `return callback(value);` for backwards compatibility.
    const callback = (ret) => {
      // Wrap ret in a Promise so that a hook function can do `callback(asyncFunction());`. Note: If
      // ret is a Promise (or other thenable), Promise.resolve() will flatten it into this new
      // Promise.
      Promise.resolve(ret).then(
          (val) => settle(null, val, 'callback'),
          (err) => settle(err, null, 'rejected Promise passed to callback'));
    };

    let ret;
    try {
      ret = hook.hook_fn(hook.hook_name, context, callback);
    } catch (err) {
      try {
        settle(err, null, 'thrown exception');
      } catch (doubleSettleErr) {
        // Schedule the throw of the double settle error on the event loop via
        // Promise.resolve().then() (which will result in an unhandled Promise rejection) so that
        // the original error is the error that is seen by the caller. Fixing the original error
        // will likely fix the double settle bug, so the original error should get priority.
        Promise.resolve().then(() => { throw doubleSettleErr; });
      }
      throw err;
    }

    // IMPORTANT: This MUST check for undefined -- not nullish -- because some hooks intentionally
    // use null as a special value.
    if (ret === undefined) {
      if (hook.hook_fn.length >= 3) {
        // The hook function has a callback parameter and it returned undefined, which means the
        // hook function will settle (or has already settled) via the provided callback.
        return;
      } else {
        // The hook function is assumed to not have a callback parameter, so fall through and accept
        // `undefined` as the resolved value.
        //
        // IMPORTANT: "Rest" parameters and default parameters are not counted in `Function.length`,
        // so the assumption does not hold for wrappers like `(...args) => { real(...args); }`. For
        // such functions, calling the callback will (eventually) cause a double settle error, and
        // the function might prematurely resolve to `undefined` instead of the desired value.
      }
    }

    // Wrap ret in a Promise so that hook functions can be async (or otherwise return a Promise).
    // Note: If ret is a Promise (or other thenable), Promise.resolve() will flatten it into this
    // new Promise.
    Promise.resolve(ret).then(
        (val) => settle(null, val, 'returned value'),
        (err) => settle(err, null, 'Promise rejection'));
  });
}

// Invokes all registered hook functions asynchronously.
//
// Arguments:
//   * hookName: Name of the hook to invoke.
//   * context: Passed unmodified to the hook functions, except nullish becomes {}.
//   * cb: Deprecated callback. The following:
//         const p1 = hooks.aCallAll('myHook', context, cb);
//     is equivalent to:
//         const p2 = hooks.aCallAll('myHook', context).then((val) => cb(null, val), cb);
//
// Return value:
//   If cb is nullish, this function resolves to a flattened array of hook results. Specifically, it
//   is equivalent to doing the following:
//     1. Collect all values returned by the hook functions into an array.
//     2. Convert each `undefined` entry into `[]`.
//     3. Flatten one level.
//   If cb is non-null, this function resolves to the value returned by cb.
exports.aCallAll = async (hookName, context, cb) => {
  if (context == null) context = {};
  const hooks = pluginDefs.hooks[hookName] || [];
  let resultsPromise = Promise.all(hooks.map((hook) => {
    return callHookFnAsync(hook, context)
        // `undefined` (but not `null`!) is treated the same as [].
        .then((result) => (result === undefined) ? [] : result);
  })).then((results) => _.flatten(results, 1));
  if (cb != null) resultsPromise = resultsPromise.then((val) => cb(null, val), cb);
  return await resultsPromise;
};

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

exports.exportedForTestingOnly = {
  callHookFnAsync,
  callHookFnSync,
  deprecationWarned,
};
