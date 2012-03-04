var path = require('path');
var minify = require('../../utils/Minify');
var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
var CachingMiddleware = require('../../utils/caching_middleware');
var settings = require("../../utils/Settings");
var Yajsml = require('yajsml');
var fs = require("fs");
var ERR = require("async-stacktrace");

exports.expressCreateServer = function (hook_name, args, cb) {
  /* Handle static files for plugins:
     paths like "/static/plugins/ep_myplugin/js/test.js"
     are rewritten into ROOT_PATH_OF_MYPLUGIN/static/js/test.js,
     commonly ETHERPAD_ROOT/node_modules/ep_myplugin/static/js/test.js
  */
  args.app.get(/^\/minified\/plugins\/([^\/]+)\/static\/(.*)/, function(req, res, next) {
    var plugin_name = req.params[0];
    var modulePath = req.url.split("?")[0].substr("/minified/plugins/".length);
    var fullPath = require.resolve(modulePath);

    if (plugins.plugins[plugin_name] == undefined) {
      return next();
    }

    fs.readFile(fullPath, "utf8", function(err, data){
      if(ERR(err)) return;
      
      res.send("require.define('" + modulePath + "', function (require, exports, module) {" + data + "})");
    })

//require.define("/plugins.js", function (require, exports, module) {

    //res.sendfile(fullPath);
  });

  // Cache both minified and static.
  var assetCache = new CachingMiddleware;
  args.app.all('/(minified|static)/*', assetCache.handle);

  // Minify will serve static files compressed (minify enabled). It also has
  // file-specific hacks for ace/require-kernel/etc.
  args.app.all('/static/:filename(*)', minify.minify);

  // Setup middleware that will package JavaScript files served by minify for
  // CommonJS loader on the client-side.
  var jsServer = new (Yajsml.Server)({
    rootPath: 'minified/'
  , rootURI: 'http://localhost:' + settings.port + '/static/js/'
  });

  var StaticAssociator = Yajsml.associators.StaticAssociator;
  var associations =
    Yajsml.associators.associationsForSimpleMapping(minify.tar);
  var associator = new StaticAssociator(associations);
  jsServer.setAssociator(associator);
  args.app.use(jsServer);

  // serve plugin definitions
  // not very static, but served here so that client can do require("pluginfw/static/js/plugin-definitions.js");
  args.app.get('/pluginfw/plugin-definitions.json', function (req, res, next) {
    res.header("Content-Type","application/json; charset: utf-8");
    res.write(JSON.stringify({"plugins": plugins.plugins, "parts": plugins.parts}));
    res.end();
  });
}
