var npm = require("npm/lib/npm.js");
var readInstalled = require("./read-installed.js");
var path = require("path");
var async = require("async");
var fs = require("fs");
var tsort = require("./tsort");
var util = require("util");
var _ = require("underscore");

var pluginUtils = require('./shared');

exports.prefix = 'ep_';
exports.loaded = false;
exports.plugins = {};
exports.parts = [];
exports.hooks = {};

exports.ensure = function (cb) {
  if (!exports.loaded)
    exports.update(cb);
  else
    cb();
};

exports.formatPlugins = function () {
  return _.keys(exports.plugins).join(", ");
};

exports.formatParts = function () {
  return _.map(exports.parts, function (part) { return part.full_name; }).join("\n");
};

exports.formatHooks = function (hook_set_name) {
  var res = [];
  var hooks = pluginUtils.extractHooks(exports.parts, hook_set_name || "hooks");

  _.chain(hooks).keys().forEach(function (hook_name) {
    _.forEach(hooks[hook_name], function (hook) {
      res.push("<dt>" + hook.hook_name + "</dt><dd>" + hook.hook_fn_name + " from " + hook.part.full_name + "</dd>");
    });
  });
  return "<dl>" + res.join("\n") + "</dl>";
};

exports.callInit = function (cb) {
  var hooks = require("./hooks");
  async.map(
    Object.keys(exports.plugins),
    function (plugin_name, cb) {
      var plugin = exports.plugins[plugin_name];
      fs.stat(path.normalize(path.join(plugin.package.path, ".ep_initialized")), function (err, stats) {
        if (err) {
          async.waterfall([
            function (cb) { fs.writeFile(path.normalize(path.join(plugin.package.path, ".ep_initialized")), 'done', cb); },
            function (cb) { hooks.aCallAll("init_" + plugin_name, {}, cb); },
            cb,
          ]);
        } else {
          cb();
        }
      });
    },
    function () { cb(); }
  );
}

exports.pathNormalization = function (part, hook_fn_name) {
  return path.normalize(path.join(path.dirname(exports.plugins[part.plugin].package.path), hook_fn_name));
}

exports.update = function (cb) {
  exports.getPackages(function (er, packages) {
    var parts = [];
    var plugins = {};
    // Load plugin metadata ep.json
    async.forEach(
      Object.keys(packages),
      function (plugin_name, cb) {
        loadPlugin(packages, plugin_name, plugins, parts, cb);
      },
      function (err) {
        if (err) cb(err);
        exports.plugins = plugins;
        exports.parts = sortParts(parts);
        exports.hooks = pluginUtils.extractHooks(exports.parts, "hooks", exports.pathNormalization);
        exports.loaded = true;
        exports.callInit(cb);
      }
    );
  });
  };

exports.getPackages = function (cb) {
  // Load list of installed NPM packages, flatten it to a list, and filter out only packages with names that
  var dir = path.resolve(npm.dir, '..');
  readInstalled(dir, function (er, data) {
    if (er) cb(er, null);
    var packages = {};
    function flatten(deps) {
      _.chain(deps).keys().each(function (name) {
        if (name.indexOf(exports.prefix) === 0) {
          packages[name] = _.clone(deps[name]);
          // Delete anything that creates loops so that the plugin
          // list can be sent as JSON to the web client
          delete packages[name].dependencies;
          delete packages[name].parent;
        }
      
        if (deps[name].dependencies !== undefined) flatten(deps[name].dependencies);
      });
    }
  
    var tmp = {};
    tmp[data.name] = data;
    flatten(tmp);
    cb(null, packages);
  });
};

function loadPlugin(packages, plugin_name, plugins, parts, cb) {
  var plugin_path = path.resolve(packages[plugin_name].path, "ep.json");
  fs.readFile(
    plugin_path,
    function (er, data) {
      if (er) {
        console.error("Unable to load plugin definition file " + plugin_path);
        return cb();
      }
      try {
        var plugin = JSON.parse(data);
        plugin['package'] = packages[plugin_name];
        plugins[plugin_name] = plugin;
        _.each(plugin.parts, function (part) {
          part.plugin = plugin_name;
          part.full_name = plugin_name + "/" + part.name;
          parts[part.full_name] = part;
        });
      } catch (ex) {
        console.error("Unable to parse plugin definition file " + plugin_path + ": " + ex.toString());
      }
      cb();
    }
  );
}

function partsToParentChildList(parts) {
  var res = [];
  _.chain(parts).keys().forEach(function (name) {
    _.each(parts[name].post || [], function (child_name)  {
      res.push([name, child_name]);
    });
    _.each(parts[name].pre || [], function (parent_name)  {
      res.push([parent_name, name]);
    });
    if (!parts[name].pre && !parts[name].post) {
      res.push([name, ":" + name]); // Include apps with no dependency info
    }
  });
  return res;
}

// Used only in Node, so no need for _
function sortParts(parts) {
  return tsort(
    partsToParentChildList(parts)
  ).filter(
    function (name) { return parts[name] !== undefined; }
  ).map(
    function (name) { return parts[name]; }
  );
}
