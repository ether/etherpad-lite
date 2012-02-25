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

  args.app.get('/static/plugins/*', function(req, res) {
    var url = req.url.replace(/\.\./g, '').split("?")[0];
    url = url.split("/");
    url.splice(0, 3);
    var plugin_name = url.splice(0, 1)[0];
    url = url.join("/");

    var filePath = path.normalize(path.join(plugins.plugins[plugin_name].package.path, "static", url));
    res.sendfile(filePath, { maxAge: exports.maxAge });
  });

  args.app.get('/static/*', function(req, res) { 
    var filePath = path.normalize(__dirname + "/../../.." +
				  req.url.replace(/\.\./g, '').split("?")[0]);
    res.sendfile(filePath, { maxAge: exports.maxAge });
  });
}
