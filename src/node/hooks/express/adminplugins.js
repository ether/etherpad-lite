var path = require('path');
var eejs = require('ep_etherpad-lite/node/eejs');
var installer = require('ep_etherpad-lite/static/js/pluginfw/installer');

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/admin/plugins', function(req, res) {
    var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
    var render_args = {
      plugins: plugins.plugins,
      query: req.query,
      search_results: {},
      errors: [],
    };

    var render = function () {
      res.send(eejs.require(
        "ep_etherpad-lite/templates/admin/plugins.html",
        render_args), {});
    };

    if (req.query.search && req.query.search != "") {
      installer.search(req.query.search, function (er, data) {
        if (er) {
          render_args.errors.push(er);
          return render();
        }
        render_args.search_results = data;
        render();
      });
    } else {
      render();
    }
  });
}