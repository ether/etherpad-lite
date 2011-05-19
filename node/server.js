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

//var http = require('http')
//var url = require('url')
var socketio = require('socket.io')
var settings = require('./settings')
var db = require('./db')
var async = require('async');
var express = require('express');
var path = require('path');

var serverName = "Etherpad-Lite ( http://j.mp/ep-lite )";

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
      var filePath = path.normalize(__dirname + "/.." + req.url);
      res.sendfile(filePath, { maxAge: 1000*60*60 });
    });
    
    //serve pad.html under /p
    app.get('/p/:pad', function(req, res)
    {
      res.header("Server", serverName);
      var filePath = path.normalize(__dirname + "/../static/pad.html");
      res.sendfile(filePath, { maxAge: 1000*60*60 });
    });
    
    //serve index.html under /
    app.get('/', function(req, res)
    {
      res.header("Server", serverName);
      var filePath = path.normalize(__dirname + "/../static/index.html");
      res.sendfile(filePath, { maxAge: 1000*60*60 });
    });
    
    //serve robots.txt
    app.get('/robots.txt', function(req, res)
    {
      res.header("Server", serverName);
      var filePath = path.normalize(__dirname + "/../static/robots.txt");
      res.sendfile(filePath, { maxAge: 1000*60*60 });
    });
    
    //serve favicon.ico
    app.get('/favicon.ico', function(req, res)
    {
      res.header("Server", serverName);
      var filePath = path.normalize(__dirname + "/../static/favicon.ico");
      res.sendfile(filePath, { maxAge: 1000*60*60 });
    });
    
    //redirect the newpad requests
    app.get('/newpad', function(req, res)
    {
      res.header("Server", serverName);
      res.redirect('/p/' + randomPadName());
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

function randomPadName() 
{
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
	var string_length = 10;
	var randomstring = '';
	for (var i=0; i<string_length; i++) {
		var rnum = Math.floor(Math.random() * chars.length);
		randomstring += chars.substring(rnum,rnum+1);
	}
	return randomstring;
}
