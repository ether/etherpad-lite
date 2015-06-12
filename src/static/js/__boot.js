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


//auto-populated by the build

/*** @START_PLUGINS **/

var entries = []; 

require('ep_headings2/static/js/index'); entries.push('ep_headings2/static/js/index');
require('ep_headings2/static/js/shared'); entries.push('ep_headings2/static/js/shared');
require('ep_fullscreen/static/js/index'); entries.push('ep_fullscreen/static/js/index');
require('ep_align/static/js/index'); entries.push('ep_align/static/js/index');
require('ep_align/static/js/shared'); entries.push('ep_align/static/js/shared');
require('ep_author_hover/static/js/index'); entries.push('ep_author_hover/static/js/index');
require('ep_adminpads/static/js/admin/pads'); entries.push('ep_adminpads/static/js/admin/pads');


/*** @END_PLUGINS **/



var exp = {
    pluginHooks: {},
    require: function (p, wot) {
        console.warn(p, arguments);

        if (entries.indexOf(p) !== -1) {
            console.warn('PLUGINHOOK', p);
            return exp.pluginHooks[p];
        }

        //debug, if somebody requires require-kernel style
        if (wot)
            throw new Error('MODULE_NOT_FOUND_OR_TOO_MANY_ARGUMENTS');
        var ret = require.call(this, p);
        console.warn(ret);
        // debugger;
        return ret;
    }
};



// @NOTE require() problem, this exposes plugin hooks
var pluginEntries = entries; //from the replaced block
console.log(pluginEntries);
var _ = require('underscore');
pluginEntries.forEach(function (entry) {
    exp.pluginHooks[entry] = require(entry);
});

module.exports = exp;