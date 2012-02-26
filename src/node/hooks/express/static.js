var path = require('path');
var minify = require('../../utils/Minify');
var plugins = require("../../pluginfw/plugins");

exports.expressCreateServer = function (hook_name, args, cb) {
  //serve static files
  args.app.get('/static/js/require-kernel.js', function (req, res, next) {
    res.header("Content-Type","application/javascript; charset: utf-8");
    res.write(minify.requireDefinition());
    res.end();
  });

  /* Handle paths like "/static/js/plugins/pluginomatic_myplugin/test.js"
     by rewriting it to ROOT_PATH_OF_MYPLUGIN/static/js/test.js,
     commonly ETHERPAD_ROOT/node_modules/pluginomatic_myplugin/static/js/test.js
  */
  args.app.get(/^\/static\/([^\/]+)\/plugins\/([^\/]+)\/(.*)/, function(req, res) {
    var type_dir = req.params[0].replace(/\.\./g, '').split("?")[0];
    var plugin_name = req.params[1];
    var url = req.params[2].replace(/\.\./g, '').split("?")[0];

    var filePath = path.normalize(path.join(plugins.plugins[plugin_name].package.path, "static", type_dir, url));
    res.sendfile(filePath, { maxAge: exports.maxAge });
  });

  // Handle normal static files
  args.app.get('/static/*', function(req, res) { 
    var filePath = path.normalize(__dirname + "/../../.." +
				  req.url.replace(/\.\./g, '').split("?")[0]);
    res.sendfile(filePath, { maxAge: exports.maxAge });
  });
}
