/**
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
var settings = require('./settings');
var db = require('./db');
var async = require('async');
var express = require('express');
var path = require('path');
var minify = require('./minify');

var serverName = "Etherpad-Lite ( http://j.mp/ep-lite )";
//cache a week
exports.maxAge = 1000*60*60*24*7;

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
    
    //serve pad.html under /p
    app.get('/p/:pad', function(req, res)
    {
      res.header("Server", serverName);
      var filePath = path.normalize(__dirname + "/../static/pad.html");
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
    var messageHandler = require("./MessageHandler");
    messageHandler.setSocketIO(io);
    io.on('connection', function(client){
      try{
        messageHandler.handleConnect(client);
      }catch(e){errorlog(e);}
      
      client.on('message', function(message){
        try{
          messageHandler.handleMessage(client, message);
        }catch(e){errorlog(e);}
      });

      client.on('disconnect', function(){
        try{
          messageHandler.handleDisconnect(client);
        }catch(e){errorlog(e);}
      });
    });
    
    callback(null);  
  }
]);

function errorlog(e)
{
  var timeStr = new Date().toUTCString() + ": ";

  if(typeof e == "string")
  {
    console.error(timeStr + e);
  }
  else if(e.stack != null)
  {
    console.error(timeStr + e.stack);
  }
  else
  {
    console.error(timeStr + JSON.stringify(e));
  }
}
