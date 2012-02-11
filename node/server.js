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
var os = require("os");
var socketio = require('socket.io');
var fs = require('fs');
var parseSettings = require('./utils/Settings').parseSettings;
var db = require('./db/DB');
var async = require('async');
var express = require('express');
var path = require('path');
var minify = require('./utils/Minify');

//try to get the git version
var version = "";
try
{
  var rootPath = path.normalize(__dirname + "/../");
  var ref = fs.readFileSync(rootPath + ".git/HEAD", "utf-8");
  var refPath = rootPath + ".git/" + ref.substring(5, ref.indexOf("\n"));
  version = fs.readFileSync(refPath, "utf-8");
  version = version.substring(0, 7);
  console.log("Your Etherpad Lite git version is " + version);
}
catch(e)
{
  console.warn("Can't get git version for server header\n" + e.message);
}

console.log("Report bugs at https://github.com/Pita/etherpad-lite/issues");

var serverName = "Etherpad-Lite " + version + " (http://j.mp/ep-lite)";

var settings = parseSettings(__dirname + '/../settings.json');

//cache 6 hours
exports.maxAge = 1000*60*60*6;

//set loglevel
log4js.setGlobalLogLevel(settings.logLevel);

async.waterfall([
  //initalize the database
  function (callback)
  {
    db.init(settings, callback);
  },
  //TOD rename dbInstance
  //initalize the http server
  function (dbInstance, callback) {
    //create server
    var app = express.createServer();

    app.maxAge = exports.maxAge;
    app.settings = settings;

    app.use(function (req, res, next) {
      res.header("Server", serverName);
      next();
    });

    //preconditions i.e. sanitize urls
    require('./routes/preconditions')(app);

    var PadManager = require('./db/PadManager').PadManager;

    var ReadOnlyManager = require('./db/ReadOnlyManager').ReadOnlyManager;

    var SecurityManager = require('./db/SecurityManager').SecurityManager;

    var AuthorManager = require('./db/AuthorManager').AuthorManager;

    var GroupManager = require('./db/GroupManager').GroupManager;

    var SessionManager = require('./db/SessionManager').SessionManager;

    //load modules that needs a initalized db
    app.readOnlyManager = new ReadOnlyManager(dbInstance);

    app.authorManager = new AuthorManager(dbInstance);

    app.padManager = new PadManager(settings, dbInstance, app.authorManager, app.readOnlyManager);

    app.groupManager = new GroupManager(dbInstance, app.padManager, null);

    app.sessionManager = new SessionManager(dbInstance, app.groupManager, app.authorManager);

    app.securityManager = new SecurityManager(settings, dbInstance, app.authorManager, app.padManager, app.sessionManager);

    app.exporthtml = require("./utils/ExportHtml");
    app.exportHandler = require('./handler/ExportHandler');
    app.importHandler = require('./handler/ImportHandler');

    //app.apiHandler = require('./handler/APIHandler');

    var SocketIORouter = require("./handler/SocketIORouter").SocketIORouter;

    //install logging
    var httpLogger = log4js.getLogger("http");
    app.configure(function()
    {
      // Activate http basic auth if it has been defined in settings.json
      if(settings.httpAuth != null) app.use(basic_auth);

      // If the log level specified in the config file is WARN or ERROR the application server never starts listening to requests as reported in issue #158.
      // Not installing the log4js connect logger when the log level has a higher severity than INFO since it would not log at that level anyway.
      if (!(settings.loglevel === "WARN" || settings.loglevel == "ERROR")) {
        app.use(log4js.connectLogger(httpLogger, { level: log4js.levels.INFO, format: ':status, :method :url'}));
      }
      app.use(express.cookieParser());
    });

    app.error(function(err, req, res, next){
      res.send(500);
      console.error(err.stack ? err.stack : err.toString());
      gracefulShutdown();
    });

    //serve static files
    app.get('/static/js/require-kernel.js', function (req, res, next) {
      res.header("Content-Type","application/javascript; charset: utf-8");
      res.write(minify.requireDefinition());
      res.end();
    });

    //serve minified files
    app.get('/minified/:filename', minify.minifyJS);

    //checks for basic http auth
    function basic_auth (req, res, next) {
      if (req.headers.authorization && req.headers.authorization.search('Basic ') === 0) {
        // fetch login and password
        if (new Buffer(req.headers.authorization.split(' ')[1], 'base64').toString() == settings.httpAuth) {
          next();
          return;
        }
      }

      res.header('WWW-Authenticate', 'Basic realm="Protected Area"');
      if (req.headers.authorization) {
        setTimeout(function () {
          res.send('Authentication required', 401);
        }, 1000);
      } else {
        res.send('Authentication required', 401);
      }
    }

    require('./routes/readonly')(app);

    require('./routes/import')(app);

    require('./routes/export')(app);

    //require('./routes/api')(app);

    require('./routes/debug')(app);

    require('./routes/static')(app);

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
      dbInstance.doShutdown(function()
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

    var PadMessageHandler = require("./handler/PadMessageHandler").PadMessageHandler;

    app.padMessageHandler = new PadMessageHandler(app.settings, app.padManager, app.authorManager, app.readOnlyManager, app.securityManager);

    //var timesliderMessageHandler = require("./handler/TimesliderMessageHandler");


    //Initalize the Socket.IO Router
    //
    app.socketIORouter = new SocketIORouter(app.securityManager);
    app.socketIORouter.setSocketIO(io);
    app.socketIORouter.addComponent("pad", app.padMessageHandler);
    //socketIORouter.addComponent("timeslider", timesliderMessageHandler);

    callback(null);
  }
]);
