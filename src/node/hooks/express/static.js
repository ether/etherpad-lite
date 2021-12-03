'use strict';

const minify = require('../../utils/Minify');
const plugins = require('../../../static/js/pluginfw/plugin_defs');
const settings = require('../../utils/Settings');
const CachingMiddleware = require('../../utils/caching_middleware');
const Yajsml = require('etherpad-yajsml');

const tar = (() => {
  const associations = {
    'pad.js': [
      'pad.js',
      'pad_utils.js',
      '$js-cookie/dist/js.cookie.js',
      'security.js',
      '$security.js',
      'vendors/browser.js',
      'pad_cookie.js',
      'pad_editor.js',
      'pad_editbar.js',
      'vendors/nice-select.js',
      'pad_modals.js',
      'pad_automatic_reconnect.js',
      'ace.js',
      'collab_client.js',
      'cssmanager.js',
      'pad_userlist.js',
      'pad_impexp.js',
      'pad_savedrevs.js',
      'pad_connectionstatus.js',
      'ChatMessage.js',
      'chat.js',
      'vendors/gritter.js',
      '$js-cookie/dist/js.cookie.js',
      '$tinycon/tinycon.js',
      'vendors/farbtastic.js',
      'skin_variants.js',
      'socketio.js',
      'colorutils.js',
    ],
    'timeslider.js': [
      'timeslider.js',
      'colorutils.js',
      'draggable.js',
      'pad_utils.js',
      '$js-cookie/dist/js.cookie.js',
      'vendors/browser.js',
      'pad_cookie.js',
      'pad_editor.js',
      'pad_editbar.js',
      'vendors/nice-select.js',
      'pad_modals.js',
      'pad_automatic_reconnect.js',
      'pad_savedrevs.js',
      'pad_impexp.js',
      'AttributePool.js',
      'Changeset.js',
      'domline.js',
      'linestylefilter.js',
      'cssmanager.js',
      'broadcast.js',
      'broadcast_slider.js',
      'broadcast_revisions.js',
      'socketio.js',
      'AttributeManager.js',
      'AttributeMap.js',
      'attributes.js',
      'ChangesetUtils.js',
    ],
    'ace2_inner.js': [
      'ace2_inner.js',
      'vendors/browser.js',
      'AttributePool.js',
      'Changeset.js',
      'ChangesetUtils.js',
      'skiplist.js',
      'colorutils.js',
      'undomodule.js',
      '$unorm/lib/unorm.js',
      'contentcollector.js',
      'changesettracker.js',
      'linestylefilter.js',
      'domline.js',
      'AttributeManager.js',
      'AttributeMap.js',
      'attributes.js',
      'scroll.js',
      'caretPosition.js',
      'pad_utils.js',
      '$js-cookie/dist/js.cookie.js',
      'security.js',
      '$security.js',
    ],
    'ace2_common.js': [
      'ace2_common.js',
      'vendors/browser.js',
      'vendors/jquery.js',
      'rjquery.js',
      '$async.js',
      'underscore.js',
      '$underscore.js',
      '$underscore/underscore.js',
      'security.js',
      '$security.js',
      'pluginfw/client_plugins.js',
      'pluginfw/plugin_defs.js',
      'pluginfw/shared.js',
      'pluginfw/hooks.js',
    ],
  };
  const prefixLocalLibraryPath = (path) => {
    if (path.charAt(0) === '$') {
      return path.slice(1);
    } else {
      return `ep_etherpad-lite/static/js/${path}`;
    }
  };
  const tar = {};
  for (const [key, relativeFiles] of Object.entries(associations)) {
    const files = relativeFiles.map(prefixLocalLibraryPath);
    tar[prefixLocalLibraryPath(key)] = files
        .concat(files.map((p) => p.replace(/\.js$/, '')))
        .concat(files.map((p) => `${p.replace(/\.js$/, '')}/index.js`));
  }
  return tar;
})();

exports.expressPreSession = async (hookName, {app}) => {
  // Cache both minified and static.
  const assetCache = new CachingMiddleware();
  app.all(/\/javascripts\/(.*)/, assetCache.handle.bind(assetCache));

  // Minify will serve static files compressed (minify enabled). It also has
  // file-specific hacks for ace/require-kernel/etc.
  app.all('/static/:filename(*)', minify.minify);

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
  const associations = Yajsml.associators.associationsForSimpleMapping(tar);
  const associator = new StaticAssociator(associations);
  jsServer.setAssociator(associator);

  app.use(jsServer.handle.bind(jsServer));

  // serve plugin definitions
  // not very static, but served here so that client can do
  // require("pluginfw/static/js/plugin-definitions.js");
  app.get('/pluginfw/plugin-definitions.json', (req, res, next) => {
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
