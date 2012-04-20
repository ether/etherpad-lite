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

var log4js = require('log4js');
var fs = require('fs');
var settings = require('./utils/Settings');
var db = require('./db/DB');
var async = require('async');
var express = require('express');
var path = require('path');
var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
var npm = require("npm/lib/npm.js");
var  _ = require("underscore");

//try to get the git version
var version = "";
try
{
  var rootPath = path.resolve(npm.dir, '..');
  var ref = fs.readFileSync(rootPath + "/.git/HEAD", "utf-8");
  var refPath = rootPath + "/.git/" + ref.substring(5, ref.indexOf("\n"));
  version = fs.readFileSync(refPath, "utf-8");
  version = version.substring(0, 7);
  console.log("Your Etherpad Lite git version is " + version);
}
catch(e) 
{
  console.warn("Can't get git version for server header\n" + e.message)
}

console.log("Report bugs at https://github.com/Pita/etherpad-lite/issues")

var serverName = "Etherpad-Lite " + version + " (http://j.mp/ep-lite)";

//set loglevel
log4js.setGlobalLogLevel(settings.loglevel);

async.waterfall([
  //initalize the database
  function (callback)
  {
    db.init(callback);
  },

  plugins.update,

  function (callback) {
    console.info("Installed plugins: " + plugins.formatPlugins());
    console.debug("Installed parts:\n" + plugins.formatParts());
    console.debug("Installed hooks:\n" + plugins.formatHooks());
    callback();
  },

  //initalize the http server
  function (callback)
  {
    //create server
    var app = express.createServer();

    app.use(function (req, res, next) {
      res.header("Server", serverName);
      next();
    });
    
    app.configure(function() { hooks.callAll("expressConfigure", {"app": app}); });
    
    hooks.callAll("expressCreateServer", {"app": app});
    
    //let the server listen
    app.listen(settings.port, settings.ip);
    console.log("You can access your Etherpad-Lite instance at http://" + settings.ip + ":" + settings.port + "/");
    if(!_.isEmpty(settings.users)){
      console.log("The plugin admin page is at http://" + settings.ip + ":" + settings.port + "/admin/plugins");
    }
    else{
      console.warn("Admin username and password not set in settings.json.  To access admin please uncomment and edit 'users' in settings.json");
    }
    callback(null);  
  }
]);
