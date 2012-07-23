var path = require('path');
var minify = require('../../utils/Minify');
var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
var CachingMiddleware = require('../../utils/caching_middleware');
var settings = require("../../utils/Settings");
var Yajsml = require('yajsml');
var fs = require("fs");
var ERR = require("async-stacktrace");
var _ = require("underscore");
var urlutil = require('url');

exports.expressCreateServer = function (hook_name, args, cb) {
  // What follows is a terrible hack to avoid loop-back within the server.
  // TODO: Serve files from another service, or directly from the file system.
  function requestURI(url, method, headers, callback, redirectCount) {
    var parsedURL = urlutil.parse(url);

    var status = 500, headers = {}, content = [];

    var mockRequest = {
      url: url
    , method: method
    , params: {filename: parsedURL.path.replace(/^\/static\//, '')}
    , headers: headers
    };
    var mockResponse = {
      writeHead: function (_status, _headers) {
        status = _status;
        for (var header in _headers) {
          if (Object.prototype.hasOwnProperty.call(_headers, header)) {
            headers[header] = _headers[header];
          }
        }
      }
    , setHeader: function (header, value) {
        headers[header.toLowerCase()] = value.toString();
      }
    , header: function (header, value) {
        headers[header.toLowerCase()] = value.toString();
      }
    , write: function (_content) {
      _content && content.push(_content);
      }
    , end: function (_content) {
        _content && content.push(_content);
        callback(status, headers, content.join(''));
      }
    };

    minify.minify(mockRequest, mockResponse);
  }
  function requestURIs(locations, method, headers, callback) {
    var pendingRequests = locations.length;
    var responses = [];

    function respondFor(i) {
      return function (status, headers, content) {
        responses[i] = [status, headers, content];
        if (--pendingRequests == 0) {
          completed();
        }
      };
    }

    for (var i = 0, ii = locations.length; i < ii; i++) {
      requestURI(locations[i], method, headers, respondFor(i));
    }

    function completed() {
      var statuss = responses.map(function (x) {return x[0]});
      var headerss = responses.map(function (x) {return x[1]});
      var contentss = responses.map(function (x) {return x[2]});
      callback(statuss, headerss, contentss);
    };
  }



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
  , requestURIs: requestURIs // Loop-back is causing problems, this is a workaround.
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

    var clientParts = _(plugins.parts)
      .filter(function(part){ return _(part).has('client_hooks') });
      
    var clientPlugins = {};
    
    _(clientParts).chain()
      .map(function(part){ return part.plugin })
      .uniq()
      .each(function(name){
        clientPlugins[name] = _(plugins.plugins[name]).clone();
        delete clientPlugins[name]['package'];
      });
      
    res.header("Content-Type","application/json; charset=utf-8");
    res.write(JSON.stringify({"plugins": clientPlugins, "parts": clientParts}));
    res.end();
  });
}
