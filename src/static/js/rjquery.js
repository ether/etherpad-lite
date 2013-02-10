
// Proviedes a require'able version of jQuery without leaking $ and jQuery;

require('./jquery');
var jq = window.$.noConflict(true);

//added the old browser recognition
jq.browser = require('./jquery_browser').browser;

exports.jQuery = exports.$ = jq;