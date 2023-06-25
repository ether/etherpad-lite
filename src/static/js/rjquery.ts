// @ts-nocheck
//FIXME Could be interesting to have a look at this
'use strict';
// Provides a require'able version of jQuery without leaking $ and jQuery;
window.$ = require('./vendors/jquery');
const jq = window.$.noConflict(true);
export { jq as $ };
