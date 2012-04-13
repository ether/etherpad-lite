
// Proviedes a require'able version of jQuery without leaking $ and jQuery;

require('./jquery');
exports.jQuery = exports.$ = $.noConflict(true);