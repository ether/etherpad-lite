'use strict';

const fs = require('fs').promises;
const minify = require('../../utils/Minify');
const path = require('path');
const plugins = require('../../../static/js/pluginfw/plugin_defs');
const settings = require('../../utils/Settings');
const CachingMiddleware = require('../../utils/caching_middleware');
const Yajsml = require('etherpad-yajsml');

// Rewrite tar to include modules with no extensions and proper rooted paths.
const getTar = async () => {
  const prefixLocalLibraryPath = (path) => {
    if (path.charAt(0) === '$') {
      return path.slice(1);
    } else {
      return `ep_etherpad-lite/static/js/${path}`;
    }
  };
  const tarJson = await fs.readFile(path.join(settings.root, 'src/node/utils/tar.json'), 'utf8');
  const tar = {};
  for (const [key, relativeFiles] of Object.entries(JSON.parse(tarJson))) {
    const files = relativeFiles.map(prefixLocalLibraryPath);
    tar[prefixLocalLibraryPath(key)] = files
        .concat(files.map((p) => p.replace(/\.js$/, '')))
        .concat(files.map((p) => `${p.replace(/\.js$/, '')}/index.js`));
  }
  return tar;
};

exports.expressCreateServer = async (hookName, args) => {
  // Cache both minified and static.
  const assetCache = new CachingMiddleware();
  args.app.all(/\/javascripts\/(.*)/, assetCache.handle.bind(assetCache));

  // Minify will serve static files compressed (minify enabled). It also has
  // file-specific hacks for ace/require-kernel/etc.
  args.app.all('/static/:filename(*)', minify.minify);

  // Setup middleware that will package JavaScript files served by minify for
  // CommonJS loader on the client-side.
  // Hostname "invalid.invalid" is a dummy value to allow parsing as a URI.
  const jsServer = new (Yajsml.Server)({
    rootPath: 'javascripts/src/',
    rootURI: 'http://invalid.invalid/static/js/',
    libraryPath: 'javascripts/lib/',
    libraryURI: 'http://invalid.invalid/static/plugins/',
    requestURIs: minify.requestURIs, // Loop-back is causing problems, this is a workaround.
  });

  const StaticAssociator = Yajsml.associators.StaticAssociator;
  const associations = Yajsml.associators.associationsForSimpleMapping(await getTar());
  const associator = new StaticAssociator(associations);
  jsServer.setAssociator(associator);

  args.app.use(jsServer.handle.bind(jsServer));

  // serve plugin definitions
  // not very static, but served here so that client can do
  // require("pluginfw/static/js/plugin-definitions.js");
  args.app.get('/pluginfw/plugin-definitions.json', (req, res, next) => {
    const clientParts = plugins.parts.filter((part) => part.client_hooks != null);
    const clientPlugins = {};
    for (const name of new Set(clientParts.map((part) => part.plugin))) {
      clientPlugins[name] = {...plugins.plugins[name]};
      delete clientPlugins[name].package;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', `public, max-age=${settings.maxAge}`);
    res.write(JSON.stringify({plugins: clientPlugins, parts: clientParts}));
    res.end();
  });
};
