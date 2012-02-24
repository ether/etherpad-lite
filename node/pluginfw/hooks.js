var plugins = require("./plugins");
var async = require("async");


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
  return exports.flatten(plugins.hooks[hook_name].map(function (hook) {
    return hook.hook(hook_name, args, function (x) { return x; });
  }));
}

exports.aCallAll = function (hook_name, args, cb) {
  async.map(
    plugins.hooks[hook_name],
    function (hook, cb) {
      hook.hook(hook_name, args, function (res) { cb(null, res); });
    },
    function (err, res) {
      cb(exports.flatten(res));
    }
  );
}

exports.callFirst = function (hook_name, args) {
  if (plugins.hooks[hook_name][0] === undefined) return [];
  return exports.flatten(plugins.hooks[hook_name][0].hook(hook_name, args, function (x) { return x; }));
}

exports.aCallFirst = function (hook_name, args, cb) {
  if (plugins.hooks[hook_name][0] === undefined) cb([]);
  plugins.hooks[hook_name][0].hook(hook_name, args, function (res) { cb(exports.flatten(res)); });
}
