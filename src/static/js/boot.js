// console.dir('asyncRequire', window.require);
// console.dir('require', require);

// var pad = require('../../static/js/pad');
// window.bundle_1 =  {
// 	foo:'bar',
// 	pad:pad
// };

// var ar = window['require'];

// var libs = ['pad', 'ace2_common', 'ace2_inner'];

// // ar.define('ep_etherpad-lite/static/js/ace2_common.js', function() {
// //   return require('../../static/js/pad');
// // });

// var pad = require('../../static/js/pad');
// ar.define('ep_etherpad-lite/static/js/pad.js', function() {
//   return pad;
// });

// ar.define('bundle.js', function() {
//   return {foo:'bar'};
// });

require('ep_etherpad-lite/static/js/browser');
require('ep_etherpad-lite/static/js/chat');
require('ep_etherpad-lite/static/js/pad_editbar');
var client_plugins = require('ep_etherpad-lite/static/js/pluginfw/client_plugins');
var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');

var $ = require('ep_etherpad-lite/static/js/rjquery').$;
window.$ = window.jQuery = $;
var pad = require('ep_etherpad-lite/static/js/pad');

// require('ep_etherpad-lite/static/js/pad_editor');
require('ep_etherpad-lite/static/js/ace2_inner');

// exports.foo='bar';
// exports.require=require;

window.bundleRequire = require;
window.require = require;
window.ETHER_BUNDLE = {
  pad: pad,
  require: require,
  hooks: hooks,
  client_plugins: client_plugins,
  jquery: $
};