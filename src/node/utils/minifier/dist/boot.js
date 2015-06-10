(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

module.exports = 'a_subst';
},{}],2:[function(require,module,exports){
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

// require('ep_etherpad-lite/static/js/browser');
// require('ep_etherpad-lite/static/js/chat');
// require('ep_etherpad-lite/static/js/pad_editbar');
// require('ep_etherpad-lite/static/js/pluginfw/client_plugins');
// require('ep_etherpad-lite/static/js/pluginfw/hooks');

// var $ = require('ep_etherpad-lite/static/js/rjquery').$;
// window.$ = window.jQuery = $;
require('/var/www/virtual/tbdev/teambutler/etherpad/etherpad-lite/src/node/utils/minifier/src/a_subst.js');

// exports.foo='bar';
// exports.require=require;

window.bundleRequire=require;
window.ETHER_BUNDLE={require:require};
},{"/var/www/virtual/tbdev/teambutler/etherpad/etherpad-lite/src/node/utils/minifier/src/a_subst.js":1}]},{},[2]);
