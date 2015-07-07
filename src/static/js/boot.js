'use strict';
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
require('ep_etherpad-lite/static/js/timeslider');


require('ep_etherpad-lite/static/js/ace');


//auto-populated by the build

/*** @START_PLUGINS **/

//%%PLUGINS

/*** @END_PLUGINS **/



var exp = {
    pluginHooks: {},
    require: function (p, wot) {
//        console.warn(p, arguments);

        if (entries.indexOf(p) !== -1) {
            console.log('PLUGINHOOK', p);
            return exp.pluginHooks[p];
        }

        //debug, if somebody requires require-kernel style
        if (wot){            
        console.log(p, wot, ret);
        throw new Error('REQUIRE_MODULE_NOT_FOUND_OR_TOO_MANY_ARGUMENTS');
        }
        var ret = require.call(this, p);
        // debugger;
        return ret;
    }
};



// @NOTE require() problem, this exposes plugin hooks
var pluginEntries = entries; //from the replaced block
//console.log(pluginEntries);
var _ = require('underscore');
pluginEntries.forEach(function (entry) {
    exp.pluginHooks[entry] = require(entry);
});

//allow postMessage and other inter-frame access
document.domain = window.location.hostname;

module.exports = exp;