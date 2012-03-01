var path = require('path');
var minify = require('../../utils/Minify');
var plugins = require("../../pluginfw/plugins");

exports.expressCreateServer = function (hook_name, args, cb) {
  //serve static files
  args.app.get('/static/js/require-kernel.js', function (req, res, next) {
    res.header("Content-Type","application/javascript; charset: utf-8");
    res.write(minify.requireDefinition()); // + "\n require.setLibraryURI('/plugins'); ");
    res.end();
  });

  // serve plugin definitions
  // not very static, but served here so that client can do require("pluginfw/static/js/plugin-definitions.js");
  args.app.get('/pluginfw/plugin-definitions.json', function (req, res, next) {
    res.header("Content-Type","application/json; charset: utf-8");
    res.write(JSON.stringify({"plugins": plugins.plugins, "parts": plugins.parts}));
    res.end();
  });


  /* Handle static files for plugins:
     paths like "/static/plugins/ep_myplugin/js/test.js"
     are rewritten into ROOT_PATH_OF_MYPLUGIN/static/js/test.js,
     commonly ETHERPAD_ROOT/node_modules/ep_myplugin/static/js/test.js
  */
  args.app.get(/^\/plugins\/([^\/]+)\/static\/(.*)/, function(req, res, next) {
    var plugin_name = req.params[0];
    var url = req.params[1].replace(/\.\./g, '').split("?")[0];

    if (plugins.plugins[plugin_name] == undefined) {
      return next();
    }

    var filePath = path.normalize(path.join(plugins.plugins[plugin_name].package.path, "static", url));

    res.sendfile(filePath, { maxAge: exports.maxAge });
  });

  // Handle normal static files
  args.app.get('/static/*', function(req, res) { 
    var filePath = path.normalize(__dirname + "/../../.." +
				  req.url.replace(/\.\./g, '').split("?")[0]);
    res.sendfile(filePath, { maxAge: exports.maxAge });
  });
}
