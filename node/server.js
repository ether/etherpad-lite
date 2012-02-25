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

var ERR = require("async-stacktrace");
var log4js = require('log4js');
var os = require("os");
var socketio = require('socket.io');
var fs = require('fs');
var settings = require('./utils/Settings');
var db = require('./db/DB');
var async = require('async');
var express = require('express');
var path = require('path');
var minify = require('./utils/Minify');
var formidable = require('formidable');
var plugins = require("./pluginfw/plugins");
var hooks = require("./pluginfw/hooks");
var apiHandler;
var exportHandler;
var importHandler;
var exporthtml;
var readOnlyManager;
var padManager;
var securityManager;
var socketIORouter;

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

    //load modules that needs a initalized db
    readOnlyManager = require("./db/ReadOnlyManager");
    exporthtml = require("./utils/ExportHtml");
    exportHandler = require('./handler/ExportHandler');
    importHandler = require('./handler/ImportHandler');
    apiHandler = require('./handler/APIHandler');
    padManager = require('./db/PadManager');
    securityManager = require('./db/SecurityManager');
    socketIORouter = require("./handler/SocketIORouter");
    hasPadAccess = require("./padaccess");
    
    //install logging      
    var httpLogger = log4js.getLogger("http");
    app.configure(function() { hooks.callAll("expressConfigure", {"app": app}); });
    
    app.error(function(err, req, res, next){
      res.send(500);
      console.error(err.stack ? err.stack : err.toString());
      gracefulShutdown();
    });
    

    //let the server listen
    app.listen(settings.port, settings.ip);
    console.log("Server is listening at " + settings.ip + ":" + settings.port);

    var onShutdown = false;
    var gracefulShutdown = function(err)
    {
      if(err && err.stack)
      {
        console.error(err.stack);
      }
      else if(err)
      {
        console.error(err);
      }
      
      //ensure there is only one graceful shutdown running
      if(onShutdown) return;
      onShutdown = true;
    
      console.log("graceful shutdown...");
      
      //stop the http server
      app.close();

      //do the db shutdown
      db.db.doShutdown(function()
      {
        console.log("db sucessfully closed.");
        
        process.exit(0);
      });
      
      setTimeout(function(){
        process.exit(1);
      }, 3000);
    }

    //connect graceful shutdown with sigint and uncaughtexception
    if(os.type().indexOf("Windows") == -1)
    {
      //sigint is so far not working on windows
      //https://github.com/joyent/node/issues/1553
      process.on('SIGINT', gracefulShutdown);
    }
    
    process.on('uncaughtException', gracefulShutdown);

    //init socket.io and redirect all requests to the MessageHandler
    var io = socketio.listen(app);
    
    //this is only a workaround to ensure it works with all browers behind a proxy
    //we should remove this when the new socket.io version is more stable
    io.set('transports', ['xhr-polling']);
    
    var socketIOLogger = log4js.getLogger("socket.io");
    io.set('logger', {
      debug: function (str)
      {
        socketIOLogger.debug.apply(socketIOLogger, arguments);
      }, 
      info: function (str)
      {
        socketIOLogger.info.apply(socketIOLogger, arguments);
      },
      warn: function (str)
      {
        socketIOLogger.warn.apply(socketIOLogger, arguments);
      },
      error: function (str)
      {
        socketIOLogger.error.apply(socketIOLogger, arguments);
      },
    });
    
    //minify socket.io javascript
    if(settings.minify)
      io.enable('browser client minification');
    
    var padMessageHandler = require("./handler/PadMessageHandler");
    var timesliderMessageHandler = require("./handler/TimesliderMessageHandler");
    
    //Initalize the Socket.IO Router
    socketIORouter.setSocketIO(io);
    socketIORouter.addComponent("pad", padMessageHandler);
    socketIORouter.addComponent("timeslider", timesliderMessageHandler);
    
    callback(null);  
  }
]);
