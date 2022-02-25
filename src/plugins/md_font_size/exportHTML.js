'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');

// Add the props to be supported in export
exports.exportHtmlAdditionalTagsWithData = async (hookName, pad) => {
  const ret = [];
  pad.pool.eachAttrib((k, v) => { if (k === 'font-size') ret.push([k, v]); });
  return ret;
};

// Include CSS for HTML export
exports.stylesForExport =
    async (hookName, padId) => eejs.require('ep_font_size/static/css/size.css');

exports.getLineHTMLForExport = async (hookName, context) => {
  // Replace data-size="foo" with class="font-size:x".
  context.lineContent = context.lineContent.replace(
      /data-font-size=["|']([0-9a-zA-Z]+)["|']/gi, 'class="font-size:$1"');
};
