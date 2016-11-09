var path = require('path');
var express = require('ep_etherpad-lite/node_modules/express');
var eejs = require("ep_etherpad-lite/node/eejs");

exports.eejsBlock_editbarMenuLeft = function (hookName, context, cb) {
	const button = eejs.require("ep_links/templates/editbarButtons.ejs", {}, module);
	const regExp = /^(.*?)<li([^<]*?)data-key="clearauthorship">(.*?)<\/li>(.*?)$/m;

	context.content = context.content.replace(/\n|\r/g, '').replace(regExp, '$1<li$2data-key="clearauthorship">$3</li>' + button + '$4');

	return cb();
}

exports.eejsBlock_body = function (hookName, context, cb) {
	context.content = context.content + eejs.require("ep_links/templates/modals.ejs", {}, module);

	return cb();
}

exports.eejsBlock_scripts = function (hookName, context, cb) {
	context.content = context.content + eejs.require("ep_links/templates/scripts.ejs", {}, module);

	return cb();
}

exports.eejsBlock_styles = function (hookName, context, cb) {
	context.content = context.content + eejs.require("ep_links/templates/styles.ejs", {}, module);

	return cb();
}
