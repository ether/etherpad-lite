var npm = require("npm/lib/npm.js");
var readInstalled = require("npm/lib/utils/read-installed.js");
var relativize = require("npm/lib/utils/relativize.js");
var readJson = require("npm/lib/utils/read-json.js");
var path = require("path");
var async = require("async");
var fs = require("fs");
var tsort = require("./tsort");

exports.prefix = 'pluginomatic_';
exports.loaded = false;
exports.plugins = {};
exports.parts = [];
exports.hooks = {};

exports.ensure = function (cb) {
  if (!exports.loaded)
    exports.update(cb);
  else
    cb();
}

exports.update = function (cb) {
  exports.getPlugins(function (er, plugins, parts, hooks) {
    exports.plugins = plugins;
    exports.parts = parts;
    exports.hooks = hooks;
    exports.loaded = true;
    cb(er);
  });
}

exports.getPlugins = function (cb) {
  exports.getPackages(function (er, packages) {
    var parts = {};
    var plugins = {};
    // Load plugin metadata pluginomatic.json
    async.forEach(
      Object.keys(packages),
      function (plugin_name, cb) {
        exports.loadPlugin(packages, plugin_name, plugins, parts, cb);
      },
      function (err) {
        parts = exports.sortParts(parts);
        var hooks = exports.extractHooks(parts);
        cb(err, plugins, parts, hooks);
      }
    );
  });
}

exports.getPackages = function (cb) {
  // Load list of installed NPM packages, flatten it to a list, and filter out only packages with names that
  // ../.. and not just .. because current dir is like ETHERPAD_ROOT/node/node_modules (!!!!)
  var dir = path.resolve(npm.dir, "../..")
  readInstalled(dir, function (er, data) {
    if (er) cb(er, null);
    var packages = {};
    function flatten(deps) {
      Object.keys(deps).forEach(function (name) {
        if (name.indexOf(exports.prefix) == 0) {
          packages[name] = deps[name];
	}
	if (deps[name].dependencies !== undefined)
	  flatten(deps[name].dependencies);
      });
    }
    flatten([data]);
    cb(null, packages);
  });
}

exports.extractHooks = function (parts) {
  var hooks = {};
  parts.forEach(function (part) {
    Object.keys(part.hooks || {}).forEach(function (hook_name) {
      if (hooks[hook_name] === undefined) hooks[hook_name] = [];
	var hook_fn_name = part.hooks[hook_name];
      hooks[hook_name].push({"hook": exports.loadFn(part.hooks[hook_name]), "part": part});
    });
  });
  return hooks;
}

exports.loadPlugin = function (packages, plugin_name, plugins, parts, cb) {
  fs.readFile(
    path.resolve(packages[plugin_name].path, "pluginomatic.json"),
    function (er, data) {
      var plugin = JSON.parse(data);
      plugin.package = packages[plugin_name];
      plugin.parts.forEach(function (part) {
	part.plugin = plugin;
	part.full_name = plugin_name + "/" + part.name;
	parts[part.full_name] = part;
      });
      cb();
    }
  );
}

exports.partsToParentChildList = function (parts) {
  var res = [];
  Object.keys(parts).forEach(function (name) {
    (parts[name].post || []).forEach(function (child_name)  {
      res.push([name, child_name]);
    });
    (parts[name].pre || []).forEach(function (parent_name)  {
      res.push([parent_name, name]);
    });
    if (!parts[name].pre && !parts[name].post) {
      res.push([name, ":" + name]); // Include apps with no dependency info
    }
  });
  return res;
}

exports.sortParts = function(parts) {
  return tsort(
    exports.partsToParentChildList(parts)
  ).filter(
    function (name) { return parts[name] !== undefined; }
  ).map(
    function (name) { return parts[name]; }
  );
};

exports.loadFn = function (path) {
  var x = path.split(":");
  var fn = require(x[0]);
  x[1].split(".").forEach(function (name) {
    fn = fn[name];
  });
  return fn;
}
