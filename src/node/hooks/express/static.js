var path = require('path');
var minify = require('../../utils/Minify');
var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
var CachingMiddleware = require('../../utils/caching_middleware');
var settings = require("../../utils/Settings");
var Yajsml = require('yajsml');
var fs = require("fs");
var ERR = require("async-stacktrace");

exports.expressCreateServer = function (hook_name, args, cb) {
  // Cache both minified and static.
  var assetCache = new CachingMiddleware;
  args.app.all('/(javascripts|static)/*', assetCache.handle);

  // Minify will serve static files compressed (minify enabled). It also has
  // file-specific hacks for ace/require-kernel/etc.
  args.app.all('/static/:filename(*)', minify.minify);

  // Setup middleware that will package JavaScript files served by minify for
  // CommonJS loader on the client-side.
  var jsServer = new (Yajsml.Server)({
    rootPath: 'javascripts/src/'
  , rootURI: 'http://localhost:' + settings.port + '/static/js/'
  , libraryPath: 'javascripts/lib/'
  , libraryURI: 'http://localhost:' + settings.port + '/static/plugins/'
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
    res.header("Content-Type","application/json; charset=utf-8");
    res.write(JSON.stringify({"plugins": plugins.plugins, "parts": plugins.parts}));
    res.end();
  });
}
