/**
 * I don't even know if we're allowed to mix Apache and MIT licesing 
 * @copyright 2015 Tudor Ilisoi.  https://github.com/tudorilisoi/
 * @license MIT 
 */

var fs = require('fs');
var log4js = require('log4js');
var apiLogger = log4js.getLogger("STATIC_ASSETS");
apiLogger.log = apiLogger.info;
var url = require('url');
var urlutil = require('url');
var path = require('path');
var express = require('express');
var minify = require('express-minify');
var mime = require('mime-types');

var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins");

var PACKAGE_ROOT = path.dirname(require.resolve('ep_etherpad-lite/ep.json'));
var WWW_DIR = path.normalize(PACKAGE_ROOT + '/static');
apiLogger.info(WWW_DIR);
// process.exit();
// xxzzwwwe

var compression = require('compression');
var _ = require('underscore');

var regexpTypes = {
    'PLUGIN_DEFS_JSON': new RegExp('^/pluginfw/plugin-definitions.json$'),
    'PLUGIN_ASSET': new RegExp('^/static/plugins/'),
    //for fun, not used currently
    'MINIFIED_JS': new RegExp('^/static/js/__.+\.js'),
    'JS': new RegExp('^/(static|custom)/.+\.js'),
    'CSS': new RegExp('^/(static|custom)/.+\.css'),
    'ASSET': new RegExp('^/(static|custom)/.+'),
    //back compat
    'PLUGIN_JS': new RegExp('^/static/plugins/'),
    'ACE_JS': new RegExp('^/static/js/ace\.js'), //should be dropped since it's included in bundle
    'LOOP_MODULE': new RegExp('^/javascripts'), //loop request 
    'REQUIRE_KERNEL': new RegExp('^/static/js/require-kernel.js'),
};

var regexpOrder = [
    // in case you need to log or anything else

    // 'MINIFIED_JS',
    // 'JS',
    // 'CSS',
    // 'ASSET',

    'PLUGIN_DEFS_JSON',
    'PLUGIN_ASSET',
    //back compat
    'REQUIRE_KERNEL'
];

function matchURIRegex(url) {
    var u = '' + url;
    var found = null;
    _.each(regexpOrder, function (typeName) {
        if (!found && regexpTypes[typeName].test(u)) {
            found = typeName;
            // apiLogger.warn(typeName, u);
        }
    });
    return found;
}

exports.expressCreateServer = function (hook_name, args, cb) {
    var app = args.app;

    //heavy assets -> hard compression
    app.use(compression({
        level: 9
    }));

    app.use(handle);
    //NOTE regexps are for content-type, not for URIs
    app.use(minify(
        {
            js_match: /\/javascript/,
            css_match: /\/css/,
            // sass_match: /scss/,
            // less_match: /less/,
            // stylus_match: /stylus/,
            // coffee_match: /coffeescript/,
            json_match: /\/json/,
            cache: path.normalize(PACKAGE_ROOT + '/../var')
        }));
    app.use('/static', express.static(WWW_DIR));
};


function handle(req, res, next) {

    var type = matchURIRegex(req.url);

    // if not interesting pass it on
    if (!type && next) {
        return next && next();
    }

    apiLogger.info('PROCESS REQ', type, req.url);

    switch (type) {
        case 'PLUGIN_DEFS_JSON':
            res._skip = true;
            handlePluginDefs(req, res, next);
            break;
        case 'PLUGIN_ASSET':
            var realPath = req.url.replace('/static/plugins/', '');
            realPath = path.normalize(PACKAGE_ROOT + '/../node_modules/' + realPath);
//            console.warn(realPath);
//            res.sendFile(realPath);
//            res._skip = true;
            res.setHeader('Content-type', mime.lookup(realPath));
            var data = fs.readFileSync(realPath, {encoding: 'utf8'});
            res.end(data);


            break;

        case 'MINIFIED_JS':
            // @see https://www.npmjs.com/package/express-minify
            //works well, the 1st request yelds HTTP 200, the 2nd HTTP 304
            // res._no_minify; //no minify
            //res._no_cache // no minify cache
            res._no_cache = true;
            res._skip = true;
            return next();
            break;

        default:
            return next && next();
            break;
    }


    res.end();
}

function handlePluginDefs(req, res, next) {

    var clientParts = _(plugins.parts)
        .filter(function (part) {
            return _(part).has('client_hooks')
        });

    var clientPlugins = {};

    _(clientParts).chain()
        .map(function (part) {
            return part.plugin
        })
        .uniq()
        .each(function (name) {
            clientPlugins[name] = _(plugins.plugins[name]).clone();
            delete clientPlugins[name]['package'];
        });

    res.header("Content-Type", "application/json; charset=utf-8");
    res.write(JSON.stringify({
        "plugins": clientPlugins,
        "parts": clientParts
    }));
    // res.end();
    next();
}


