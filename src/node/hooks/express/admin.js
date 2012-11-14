var eejs = require('ep_etherpad-lite/node/eejs');

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/admin', function(req, res) {
    res.send( eejs.require("ep_etherpad-lite/templates/admin/index.html", {}) );
  });
}

