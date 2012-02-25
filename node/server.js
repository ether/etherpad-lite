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
var plugins = require("./pluginfw/plugins");
var hooks = require("./pluginfw/hooks");

//try to get the git version
var version = "";
try
{
  var rootPath = path.normalize(__dirname + "/../")
  var ref = fs.readFileSync(rootPath + ".git/HEAD", "utf-8");
  var refPath = rootPath + ".git/" + ref.substring(5, ref.indexOf("\n"));
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

//cache 6 hours
exports.maxAge = 1000*60*60*6;

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
    console.log("Installed plugins: " + plugins.formatPlugins());
    console.log("Installed parts:\n" + plugins.formatParts());
    console.log("Installed hooks:\n" + plugins.formatHooks());
    callback();
  },

  //initalize the http server
  function (callback)
  {
    //create server
    var app = express.createServer();
    hooks.callAll("expressCreateServer", {"app": app});

    app.use(function (req, res, next) {
      res.header("Server", serverName);
      next();
    });
    
    app.configure(function() { hooks.callAll("expressConfigure", {"app": app}); });
    
    //let the server listen
    app.listen(settings.port, settings.ip);
    console.log("Server is listening at " + settings.ip + ":" + settings.port);

    callback(null);  
  }
]);
