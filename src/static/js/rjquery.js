
// Proviedes a require'able version of jQuery without leaking $ and jQuery;
window.$ = require('./jquery');
var jq = window.$.noConflict(true);
exports.jQuery = exports.$ = jq;
