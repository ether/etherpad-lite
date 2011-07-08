/**
 * This module is started with bin/run.sh. It sets up a Express HTTP and a Socket.IO Server. 
 * Static file Requests are answered directly from this module, Socket.IO messages are passed 
 * to MessageHandler and minfied requests are passed to minified.
 */

/*
 * 2011 Peter 'Pita' Martischka
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

require('joose');

var socketio = require('socket.io');
var fs = require('fs');
var settings = require('./settings');
var socketIORouter = require("./SocketIORouter");
var db = require('./db');
var async = require('async');
var express = require('express');
var path = require('path');
var minify = require('./minify');
var exporthtml;
var readOnlyManager;

//try to get the git version
var version = "";
try
{
  var ref = fs.readFileSync("../.git/HEAD", "utf-8");
  var refPath = "../.git/" + ref.substring(5, ref.indexOf("\n"));
  version = fs.readFileSync(refPath, "utf-8");
  version = version.substring(0, 8);
}
catch(e) 
{
  console.error("Can't get git version for server header\n" + e.message)
}

var serverName = "Etherpad-Lite " + version + " (http://j.mp/ep-lite)";

//cache a week
exports.maxAge = 1000*60*60*6;

async.waterfall([
  //initalize the database
  function (callback)
  {
    db.init(callback);
  },
  //initalize the http server
  function (callback)
  {
    //create server
    var app = express.createServer();
    
    //load modules that needs a initalized db
    readOnlyManager = require("./ReadOnlyManager");
    exporthtml = require("./exporters/exporthtml");
    
    //set logging
    if(settings.logHTTP)
      app.use(express.logger({ format: ':date: :status, :method :url' }));
    
    //serve static files
    app.get('/static/*', function(req, res)
    { 
      res.header("Server", serverName);
      var filePath = path.normalize(__dirname + "/.." + req.url.split("?")[0]);
      res.sendfile(filePath, { maxAge: exports.maxAge });
    });
    
    //serve minified files
    app.get('/minified/:id', function(req, res)
    { 
      res.header("Server", serverName);
      
      var id = req.params.id;
      
      if(id == "pad.js")
      {
        minify.padJS(req,res);
      }
      else
      {
        res.send('404 - Not Found', 404);
      }
    });
    
    //serve read only pad
    app.get('/ro/:id', function(req, res)
    { 
      res.header("Server", serverName);
      
      var html;
      var padId;
      var pad;
      
      async.series([
        //translate the read only pad to a padId
        function(callback)
        {
          readOnlyManager.getPadId(req.params.id, function(err, _padId)
          {
            padId = _padId;
            callback(err);
          });
        },
        //render the html document
        function(callback)
        {
          //return if the there is no padId
          if(padId == null)
          {
            callback("notfound");
            return;
          }
          
          //render the html document
          exporthtml.getPadHTMLDocument(padId, null, false, function(err, _html)
          {
            html = _html;
            callback(err);
          });
        }
      ], function(err)
      {
        //throw any unexpected error
        if(err && err != "notfound")
          throw err;
          
        if(err == "notfound")
          res.send('404 - Not Found', 404);
        else
          res.send(html);
      });
    });
    
    //serve pad.html under /p
    app.get('/p/:pad', function(req, res, next)
    {
      //ensure the padname is valid and the url doesn't end with a /
      if(!isValidPadname(req.params.pad) || /\/$/.test(req.url))
      {
        next();
        return;
      }
      
      res.header("Server", serverName);
      var filePath = path.normalize(__dirname + "/../static/pad.html");
      res.sendfile(filePath, { maxAge: exports.maxAge });
    });
    
    //serve timeslider.html under /p/$padname/timeslider
    app.get('/p/:pad/timeslider', function(req, res, next)
    {
      //ensure the padname is valid and the url doesn't end with a /
      if(!isValidPadname(req.params.pad) || /\/$/.test(req.url))
      {
        next();
        return;
      }
      
      res.header("Server", serverName);
      var filePath = path.normalize(__dirname + "/../static/timeslider.html");
      res.sendfile(filePath, { maxAge: exports.maxAge });
    });
    
    //serve index.html under /
    app.get('/', function(req, res)
    {
      res.header("Server", serverName);
      var filePath = path.normalize(__dirname + "/../static/index.html");
      res.sendfile(filePath, { maxAge: exports.maxAge });
    });
    
    //serve robots.txt
    app.get('/robots.txt', function(req, res)
    {
      res.header("Server", serverName);
      var filePath = path.normalize(__dirname + "/../static/robots.txt");
      res.sendfile(filePath, { maxAge: exports.maxAge });
    });
    
    //serve favicon.ico
    app.get('/favicon.ico', function(req, res)
    {
      res.header("Server", serverName);
      var filePath = path.normalize(__dirname + "/../static/favicon.ico");
      res.sendfile(filePath, { maxAge: exports.maxAge });
    });
    
    //let the server listen
    app.listen(settings.port);
    console.log("Server is listening at port " + settings.port);

    //init socket.io and redirect all requests to the MessageHandler
    var io = socketio.listen(app);
    
    //this is only a workaround to ensure it works with all browers behind a proxy
    //we should remove this when the new socket.io version is more stable
    io.set('transports', ['xhr-polling']);
    
    //reduce the log level
    io.set('log level', 2);
    
    var padMessageHandler = require("./PadMessageHandler");
    var timesliderMessageHandler = require("./TimesliderMessageHandler");
    
    //Initalize the Socket.IO Router
    socketIORouter.setSocketIO(io);
    socketIORouter.addComponent("pad", padMessageHandler);
    socketIORouter.addComponent("timeslider", timesliderMessageHandler);
    
    callback(null);  
  }
]);

function isValidPadname(padname)
{
  //ensure there is no dollar sign in the pad name
  if(padname.indexOf("$")!=-1)
    return false;
  
  return true;
}
