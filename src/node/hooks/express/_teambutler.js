var log4js = require('log4js');
var apiLogger = log4js.getLogger("STATIC_ASSETS");
apiLogger.log = apiLogger.info;
var url = require('url');
var urlutil = require('url');
var path = require('path');
// var serveStatic = require('serve-static');
var express = require('express');

var ROOT_DIR = path.normalize(__dirname + "../../../../static");
apiLogger.info(ROOT_DIR);
// process.exit();
// xxzzwwwe

var compression = require('compression');
var _ = require('underscore');

var regexpTypes = {
  'PLUGIN_JS': new RegExp('^/static/plugins/'),
  'REQUIRE_KERNEL': new RegExp('^/static/js/require-kernel.js'),
  'BUNDLED_MODULE': new RegExp('^/javascripts'),
  'JS': new RegExp('^/static/.+\.js'),
  'ASSET': new RegExp('^/static/.+\.png|jpg|css'),
};

var regexpOrder = [
  'PLUGIN_JS',
  'REQUIRE_KERNEL',
  'BUNDLED_MODULE',
// 'JS',
// 'ASSET'
];

function matchFilename(url) {
  var u = '' + url;
  var found = null;
  _.each(regexpOrder, function(typeName) {
    if (!found && regexpTypes[typeName].test(u)) {
      found = typeName;
      apiLogger.warn(typeName, u);
    }
  });
  return found;
}

// var staticWare = serveStatic(ROOT_DIR, {
//   'index': ['default.html', 'default.htm']
// });

// function serveStaticAsset(req, res, next){
// return staticWare
// }

exports.expressCreateServer = function(hook_name, args, cb) {


  function handle(req, res, next) {

    var url = req.url;
    var parsedURL = urlutil.parse(url);

    var type = matchFilename(url);



    var filename = parsedURL.pathname.replace(/^\/static\//, '');

    if (type) {
      apiLogger.warn(parsedURL);
      apiLogger.warn('******', type, filename);
      switch (type) {
        // @NOTE: obsolete
        case 'BUNDLED_MODULE':
          var oldURL = req.url;
          // req.url = req.url.replace('/javascripts/lib/ep_etherpad-lite', '');
          // apiLogger.info(oldURL+ ' => ' + req.url);
          var moduleName = filename.replace('/javascripts/lib/', '');
          var data = 'require.defineModule("' +
            moduleName + '" , function(require, exports, module){ ' +
            '\n var ret = window.ETHER_BUNDLE.require("' + moduleName + '");' +
            '\n console.log("ret",ret);' +
            '\n debugger;' +
            '\n return function(){return ret;}' +
            '\n}' +
            '\n)';
          res.write(data);
          res.end();
          return;
          // next && next();
          break;

        case 'REQUIRE_KERNEL':
          // req.url = req.url.replace('/javascripts/lib/ep_etherpad-lite', '');
          var RequireKernel = require('etherpad-require-kernel');
          // apiLogger.warn(RequireKernel);
          res.write('var require = ' + RequireKernel.kernelSource + ';\n');
          res.end();
          return;
          break;

        default:
          next && next();
          return;
          break;
      }
      ;


    // return;
    //return staticWare(req, res, next);
    }

    next && next();
    return;




    // apiLogger.warn(filename);

    // No relative paths, especially if they may go up the file hierarchy.
    filename = path.normalize(path.join(ROOT_DIR, filename));
    filename = filename.replace(/\.\./g, '')

    if (filename.indexOf(ROOT_DIR) == 0) {
      filename = filename.slice(ROOT_DIR.length);
      filename = filename.replace(/\\/g, '/')
    } else {
      res.writeHead(404, {});
      res.end();
      return;
    }
  }

  // args.app.use('compression', function filter(req, res) {
  //   if (matchFilename(req.url)){
  //     return compression.filter(req, res);
  //   };
  // });


  var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");
  //NOTE: subject to move
  // serve plugin definitions
  // not very static, but served here so that client can do require("pluginfw/static/js/plugin-definitions.js");
  args.app.get('/pluginfw/plugin-definitions.json', function(req, res, next) {

    var clientParts = _(plugins.parts)
      .filter(function(part) {
        return _(part).has('client_hooks')
      });

    var clientPlugins = {};

    _(clientParts).chain()
      .map(function(part) {
        return part.plugin
      })
      .uniq()
      .each(function(name) {
        clientPlugins[name] = _(plugins.plugins[name]).clone();
        delete clientPlugins[name]['package'];
      });

    res.header("Content-Type", "application/json; charset=utf-8");
    res.write(JSON.stringify({
      "plugins": {}, //@TODO temp disabled
      "parts":{}
      // "plugins": clientPlugins,
      // "parts": clientParts
    }));
    res.end();
  });

  args.app.use(handle);
  args.app.use('/static', express.static(ROOT_DIR));








  // var allowCrossDomain = function(req, res, next) {
  //   res.header('Access-Control-Allow-Origin', '*');
  //   res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  //   res.header('Access-Control-Allow-Headers', 'Content-Type');

  //   next();
  // };

  function shouldCompress(req, res) {
    return false;

    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;

    if (!query['callback']) {
      apiLogger.warn('NON COMPRESSSED', req.url);
      return false;
    }

  // fallback to standard filter function
  // return compression.filter(req, res)
  }


  // args.app.use(allowCrossDomain);
  // args.app.use(compression({
  //   filter: shouldCompress
  // }));



};