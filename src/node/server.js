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
  , NodeVersion = require('./utils/NodeVersion')
  ;

log4js.replaceConsole();

/*
 * early check for version compatibility before calling
 * any modules that require newer versions of NodeJS
 */
NodeVersion.enforceMinNodeVersion('10.13.0');

/*
 * Etherpad 1.8.3 will require at least nodejs 10.13.0.
 */
NodeVersion.checkDeprecationStatus('10.13.0', '1.8.3');

/*
 * start up stats counting system
 */
var stats = require('./stats');
stats.gauge('memoryUsage', function() {
  return process.memoryUsage().rss;
});

/*
 * no use of let or await here because it would cause startup
 * to fail completely on very early versions of NodeJS
 */
var npm = require("npm/lib/npm.js");

npm.load({}, function() {
  var settings = require('./utils/Settings');
  var db = require('./db/DB');
  var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
  var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
  hooks.plugins = plugins;

  db.init()
    .then(plugins.update)
    .then(function() {
      console.info("Installed plugins: " + plugins.formatPluginsWithVersion());
      console.debug("Installed parts:\n" + plugins.formatParts());
      console.debug("Installed hooks:\n" + plugins.formatHooks());

      // Call loadSettings hook
      hooks.aCallAll("loadSettings", { settings: settings });

      // initalize the http server
      hooks.callAll("createServer", {});
    })
    .catch(function(e) {
      console.error("exception thrown: " + e.message);
      if (e.stack) {
        console.log(e.stack);
      }
      process.exit(1);
    });
});
