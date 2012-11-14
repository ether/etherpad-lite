var path = require('path');
var eejs = require('ep_etherpad-lite/node/eejs');
var settings = require('ep_etherpad-lite/node/utils/Settings');
var installer = require('ep_etherpad-lite/static/js/pluginfw/installer');
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
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

    socket.on("saveSettings", function (settings) {
      fs.writeFile('settings.json', settings, function (err) {
        if (err) throw err;
        socket.emit("saveprogress", "saved");
      });
    });

    socket.on("restartServer", function () {
      console.log("Admin request to restart server through a socket on /admin/settings");
      settings.reloadSettings();
      hooks.aCallAll("restartServer", {}, function () {});

    });

  });
}
