var $, jQuery;
$ = jQuery = require("ep_etherpad-lite/static/js/rjquery").$;
var _ = require("underscore");

var pluginUtils = require('./shared');

exports.loaded = false;
exports.plugins = {};
exports.parts = [];
exports.hooks = {};
exports.baseURL = '';

exports.ensure = function (cb) {
  if (!exports.loaded)
    exports.update(cb);
  else
    cb();
};

exports.update = function (cb) {
  // It appears that this response (see #620) may interrupt the current thread
  // of execution on Firefox. This schedules the response in the run-loop,
  // which appears to fix the issue.
  var callback = function () {setTimeout(cb, 0);};

  jQuery.getJSON(exports.baseURL + 'pluginfw/plugin-definitions.json', function(data) {
    exports.plugins = data.plugins;
    exports.parts = data.parts;
    exports.hooks = pluginUtils.extractHooks(exports.parts, "client_hooks");
    exports.loaded = true;
    callback();
   }).error(function(xhr, s, err){
     console.error("Failed to load plugin-definitions: " + err);
     callback();
   });
};
