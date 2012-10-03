var path = require('path');
var eejs = require('ep_etherpad-lite/node/eejs');
var installer = require('ep_etherpad-lite/static/js/pluginfw/installer');
var plugins = require('ep_etherpad-lite/static/js/pluginfw/plugins');

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/admin/plugins', function(req, res) {
    var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
    var render_args = {
      plugins: plugins.plugins,
      search_results: {},
      errors: [],
    };

    res.send( eejs.require("ep_etherpad-lite/templates/admin/plugins.html", render_args) );
  });
  args.app.get('/admin/plugins/info', function(req, res) {
    res.send( eejs.require("ep_etherpad-lite/templates/admin/plugins-info.html", {}) );
  });
}

exports.socketio = function (hook_name, args, cb) {
  var io = args.io.of("/pluginfw/installer");
  io.on('connection', function (socket) {
    if (!socket.handshake.session.user || !socket.handshake.session.user.is_admin) return;

    socket.on("load", function (query) {
      socket.emit("installed-results", {results: plugins.plugins});
    });

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
  });
}
