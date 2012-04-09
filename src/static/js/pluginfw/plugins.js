exports.isClient = typeof global != "object";

var _;

if (!exports.isClient) {
  var npm = require("npm/lib/npm.js");
  var readInstalled = require("./read-installed.js");
  var relativize = require("npm/lib/utils/relativize.js");
  var readJson = require("npm/lib/utils/read-json.js");
  var path = require("path");
  var async = require("async");
  var fs = require("fs");
  var tsort = require("./tsort");
  var util = require("util");
  _ = require("underscore");
}else{
  var $, jQuery;
  $ = jQuery = require("ep_etherpad-lite/static/js/rjquery").$;
  _ = require("ep_etherpad-lite/static/js/underscore");
}

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

exports.formatHooks = function () {
  var res = [];
  _.chain(exports.hooks).keys().forEach(function (hook_name) {
    _.forEach(exports.hooks[hook_name], function (hook) {
      res.push(hook.hook_name + ": " + hook.hook_fn_name + " from " + hook.part.full_name);
    });
  });
  return res.join("\n");
};

exports.loadFn = function (path, hookName) {
  var x = path.split(":");
  var fn = require(x[0]);
  var functionName = x[1] ? x[1] : hookName;  
  
  _.each(functionName.split("."), function (name) {
    fn = fn[name];
  });
  return fn;
};

exports.extractHooks = function (parts, hook_set_name) {
  var hooks = {};
  _.each(parts,function (part) {
    _.chain(part[hook_set_name] || {})
    .keys()
    .each(function (hook_name) {
      if (hooks[hook_name] === undefined) hooks[hook_name] = [];
      
      
      var hook_fn_name = part[hook_set_name][hook_name];
      var hook_fn = exports.loadFn(hook_fn_name, hook_name);
      if (hook_fn) {
        hooks[hook_name].push({"hook_name": hook_name, "hook_fn": hook_fn, "hook_fn_name": hook_fn_name, "part": part});
      } else {
        console.error("Unable to load hook function for " + part.full_name + " for hook " + hook_name + ": " + part.hooks[hook_name]);
      }	
    });
  });
  return hooks;
};


if (exports.isClient) {
  exports.update = function (cb) {
    jQuery.getJSON('/pluginfw/plugin-definitions.json', function(data) {
      exports.plugins = data.plugins;
      exports.parts = data.parts;
      exports.hooks = exports.extractHooks(exports.parts, "client_hooks");
      exports.loaded = true;
      cb();
     }).error(function(xhr, s, err){
       console.error("Failed to load plugin-definitions: " + err);
       cb();
     });
  };
} else {

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

exports.update = function (cb) {
  exports.getPackages(function (er, packages) {
    var parts = [];
    var plugins = {};
    // Load plugin metadata ep.json
    async.forEach(
      Object.keys(packages),
      function (plugin_name, cb) {
        exports.loadPlugin(packages, plugin_name, plugins, parts, cb);
      },
      function (err) {
        if (err) cb(err);
	exports.plugins = plugins;
        exports.parts = exports.sortParts(parts);
        exports.hooks = exports.extractHooks(exports.parts, "hooks");
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

  exports.loadPlugin = function (packages, plugin_name, plugins, parts, cb) {
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
  };

exports.partsToParentChildList = function (parts) {
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
};


// Used only in Node, so no need for _
exports.sortParts = function(parts) {
  return tsort(
    exports.partsToParentChildList(parts)
  ).filter(
    function (name) { return parts[name] !== undefined; }
  ).map(
    function (name) { return parts[name]; }
  );
};

}