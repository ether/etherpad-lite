var npm = require("npm/lib/npm.js");
var readInstalled = require("npm/lib/utils/read-installed.js");
var relativize = require("npm/lib/utils/relativize.js");
var readJson = require("npm/lib/utils/read-json.js");
var path = require("path");
var async = require("async");
var fs = require("fs");
var tsort = require("./tsort");

var PLUGIN_PREFIX = 'pluginomatic_';

exports.getPlugins = function (cb, prefix) {
  prefix = prefix || PLUGIN_PREFIX;

  // Load list of installed NPM packages, flatten it to a list, and filter out only packages with names that
  // ../.. and not just .. because current dir is like ETHERPAD_ROOT/node/node_modules (!!!!)
  var dir = path.resolve(npm.dir, "../..")
  readInstalled(dir, function (er, data) {
    var plugins = {};
    var parts = {};
    function flatten(deps) {
      Object.keys(deps).forEach(function (name) {
        if (name.indexOf(prefix) == 0) {
          plugins[name] = deps[name];
	}
	if (deps[name].dependencies !== undefined)
	  flatten(deps[name].dependencies);
      });
    }
    flatten([data]);

    // Load plugin metadata pluginomatic.json
    async.forEach(
      Object.keys(plugins),
      function (plugin_name, cb) {
	fs.readFile(
	  path.resolve(plugins[plugin_name].path, "pluginomatic.json"),
          function (er, data) {
	    plugin = JSON.parse(data);
	    plugin.package = plugins[plugin_name];
	    plugins[plugin_name] = plugin;
	    plugin.parts.forEach(function (part) {
	      part.plugin = plugin;
              part.full_name = plugin_name + "." + part.name;
	      parts[part.full_name] = part;
            });
	    cb();
	  }
        );
      },
      function (err) {
        cb(err, plugins, exports.sortParts(parts));
      }
    );
  });
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
