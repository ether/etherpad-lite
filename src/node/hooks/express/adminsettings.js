var path = require('path');
var eejs = require('ep_etherpad-lite/node/eejs');
var installer = require('ep_etherpad-lite/static/js/pluginfw/installer');
var fs = require('fs');

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/admin/settings', function(req, res) {

    var render_args = {
      settings: "",
      search_results: {},
      errors: []
    };

    res.send( eejs.require("ep_etherpad-lite/templates/admin/settings.html", render_args) );

  });
}

exports.socketio = function (hook_name, args, cb) {
  var io = args.io.of("/settings");
  io.on('connection', function (socket) {
    if (!socket.handshake.session.user || !socket.handshake.session.user.is_admin) return;

    socket.on("load", function (query) {
//      socket.emit("installed-results", {results: plugins.plugins});
      fs.readFile('settings.json', 'utf8', function (err,data) {
        if (err) {
          return console.log(err);
        }
        else
        {
          socket.emit("settings", {results: data});
        }
      });
    });

/*
    socket.on("search", function (query) {
      socket.emit("progress", {progress:0, message:'Fetching results...'});
        installer.search(query, true, function (progress) {
        if (progress.results)
          socket.emit("search-result", progress);
        socket.emit("progress", progress);
      });
    });

    socket.on("install", function (plugin_name) {
      socket.emit("progress", {progress:0, message:'Downloading and installing ' + plugin_name + "..."});
      installer.install(plugin_name, function (progress) {
        socket.emit("progress", progress);
      });
    });

    socket.on("uninstall", function (plugin_name) {
      socket.emit("progress", {progress:0, message:'Uninstalling ' + plugin_name + "..."});
      installer.uninstall(plugin_name, function (progress) {
        socket.emit("progress", progress);
      });
    });
*/
  });
}
