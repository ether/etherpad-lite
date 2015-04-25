#!/usr/bin/env node
/**
 * This module is started with bin/run.sh. It sets up a Express HTTP and a Socket.IO Server. 
 * Static file Requests are answered directly from this module, Socket.IO messages are passed 
 * to MessageHandler and minfied requests are passed to minified.
 */

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var log4js = require('log4js')
  , async = require('async')
  , stats = require('./stats')
  ;

log4js.replaceConsole();

stats.gauge('memoryUsage', function() {
  return process.memoryUsage().rss
})

var settings
  , db
  , plugins
  , hooks;
var npm = require("npm/lib/npm.js");

async.waterfall([
  // load npm
  function(callback) {
    npm.load({}, function(er) {
      callback(er)
    })
  },
  
  // load everything
  function(callback) {
    settings = require('./utils/Settings');
    db = require('./db/DB');
    plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
    hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
    hooks.plugins = plugins;
    callback();
  },
  
  //initalize the database
  function (callback)
  {
    db.init(callback);
  },

  function(callback) {
    plugins.update(callback)
  },

  function (callback) {
    console.info("Installed plugins: " + plugins.formatPlugins());
    console.debug("Installed parts:\n" + plugins.formatParts());
    console.debug("Installed hooks:\n" + plugins.formatHooks());

    // Call loadSettings hook
    hooks.aCallAll("loadSettings", { settings: settings });

    callback();
  },

  //initalize the http server
  function (callback)
  {
    hooks.callAll("createServer", {});
    callback(null);  
  }
]);
