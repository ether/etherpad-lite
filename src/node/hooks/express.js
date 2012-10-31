var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
var http = require('http');
var express = require('express');
var settings = require('../utils/Settings');
var fs = require('fs');
var path = require('path');
var npm = require("npm/lib/npm.js");
var  _ = require("underscore");

var server;
var serverName;

exports.createServer = function () {
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

  serverName = "Etherpad-Lite " + version + " (http://j.mp/ep-lite)";

  exports.restartServer();

  console.log("You can access your Etherpad-Lite instance at http://" + settings.ip + ":" + settings.port + "/");
  if(!_.isEmpty(settings.users)){
    console.log("The plugin admin page is at http://" + settings.ip + ":" + settings.port + "/admin/plugins");
  }
  else{
    console.warn("Admin username and password not set in settings.json.  To access admin please uncomment and edit 'users' in settings.json");
  }

}

exports.restartServer = function () {

  if (server) {
    console.log("Restarting express server");
    server.close();
  }

  var app = express(); // New syntax for express v3
  server = http.createServer(app);

  app.use(function (req, res, next) {
    res.header("Server", serverName);
    next();
  });

  app.configure(function() {
    hooks.callAll("expressConfigure", {"app": app});
  });
  hooks.callAll("expressCreateServer", {"app": app, "server": server});

  server.listen(settings.port, settings.ip);
}
