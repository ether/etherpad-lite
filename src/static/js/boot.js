// var _r = require;
// var bundleRequire = function(p) {
//   console.warn(p);
//   return _r.call(global, p);
// };
// global.require = bundleRequire;
// exports.require = bundleRequire;

// window.bundleRequire = require;
// console.dir(require);
// window.require = global.require;
// window.bundleRequire = _r;

require('ep_etherpad-lite/static/js/browser');
require('ep_etherpad-lite/static/js/pad_editbar');

var client_plugins = require('ep_etherpad-lite/static/js/pluginfw/client_plugins');
var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');

var $ = require('ep_etherpad-lite/static/js/rjquery').$;
window.$ = window.jQuery = $;

var pad = require('ep_etherpad-lite/static/js/pad');

require('ep_etherpad-lite/static/js/collab_client');
require('ep_etherpad-lite/static/js/pad_editor');
require('ep_etherpad-lite/static/js/pad_impexp');
require('ep_etherpad-lite/static/js/chat');
require('ep_etherpad-lite/static/js/ace2_inner');


require('ep_etherpad-lite/static/js/ace');

// @NOTE relative paths problem
require('./__client_hooks.js');

/*** MANUAL ***/
require('ep_fullscreen/static/js/index');

// exports.foo='bar';



// window.ETHER_BUNDLE = {
//   pad: pad,
//   require: require,
//   hooks: hooks,
//   client_plugins: client_plugins,
//   jquery: $
// };
// console.info(ETHER_BUNDLE);
// console.dir(window.ETHER_BUNDLE);






module.exports = {
  require: function(p, wot) {
    console.warn(p, arguments);

    if (p.indexOf('ep_fullscreen') !== -1) {
      var f = function() {
        console.warn('fake', arguments);
      };
      return{
        postAceInit:f,
        documentReady:f
      };
    }

    if (wot)
      throw new Error('MODULE_NOT_FOUND_OR_TOO_MANY_ARGUMENTS');
    var ret = require.call(this, p);
    console.warn(ret);
    // debugger;
    return ret;
  }
};