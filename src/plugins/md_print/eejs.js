'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');
const settings = require('ep_etherpad-lite/node/utils/Settings');

exports.eejsBlock_styles = (hook_name, args, cb) => {
  args.content +=
      '<link href=\'../static/plugins/ep_print/static/css/print.css\' rel=\'stylesheet\'>';
  cb();
};

exports.eejsBlock_editbarMenuRight = (hook_name, args, cb) => {
  if (settings.ep_print && settings.ep_print.hideButton === true) return cb();

  args.content = eejs.require('ep_print/templates/editbarButtons.ejs') + args.content;
  cb();
};
