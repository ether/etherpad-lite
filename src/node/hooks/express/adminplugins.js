var path = require('path');
var eejs = require('ep_etherpad-lite/node/eejs');
var installer = require('ep_etherpad-lite/static/js/pluginfw/installer');

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/admin/plugins', function(req, res) {
    var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
    var render_args = {
      plugins: plugins.plugins,
      search_results: {},
      errors: [],
    };

    res.send(eejs.require(
      "ep_etherpad-lite/templates/admin/plugins.html",
      render_args), {});
  });
}

exports.socketio = function (hook_name, args, cb) {
  var io = args.io.of("/pluginfw/installer");
  io.on('connection', function (socket) {
    socket.on("search", function (query) {
      socket.emit("progress", {progress:0, message:'Fetching results...'});
      installer.search(query, function (er, data) {
        if (er) {
          socket.emit("progress", {progress:1, error:er});
        } else {        
          socket.emit("search-result", {results: data});
          socket.emit("progress", {progress:1, message:'Done.'});
        }
      });
    });

    socket.on("install", function (query) {
    });

    socket.on("uninstall", function (query) {
    });




  });
}
