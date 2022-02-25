'use strict';

const fonts = [
  'fontarial',
  'fontavant-garde',
  'fontbookman',
  'fontcalibri',
  'fontcourier',
  'fontgaramond',
  'fonthelvetica',
  'fontmonospace',
  'fontpalatino',
  'fonttimes-new-roman',
];

const eejs = require('ep_etherpad-lite/node/eejs/');

/** ******************
* UI
*/
exports.eejsBlock_editbarMenuLeft = (hookName, args, cb) => {
  args.content += eejs.require('ep_font_family/templates/editbarButtons.ejs');
  return cb();
};

exports.eejsBlock_dd_format = (hookName, args, cb) => {
  args.content += eejs.require('ep_font_family/templates/fileMenu.ejs');
  return cb();
};


/** ******************
* Editor
*/

// Allow <whatever> to be an attribute
exports.aceAttribClasses = (hookName, attr, cb) => {
  for (const i of fonts) {
    const font = fonts[i];
    attr[font] = `tag:font${font}`;
  }
  cb(attr);
};

/** ******************
* Export
*/

// Add the props to be supported in export
exports.exportHtmlAdditionalTags = (hook, pad, cb) => {
  cb(fonts);
};

exports.getLineHTMLForExport = async (hook, context, cb) => {
  let lineContent = context.lineContent;
  fonts.forEach((font) => {
    if (lineContent) {
      const fontName = font.substring(4);
      lineContent = lineContent.replaceAll(`<${font}`, `<span style='font-family:${fontName}'`);
      lineContent = lineContent.replaceAll(`</${font}`, '</span');
    }
  });
  context.lineContent = lineContent;
};


/* eslint-disable-next-line no-extend-native, max-len */
String.prototype.replaceAll = function (str1, str2, ignore) {
/* eslint-disable-next-line no-useless-escape, max-len */
  return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g, '\\$&'), (ignore ? 'gi' : 'g')), (typeof (str2) === 'string') ? str2.replace(/\$/g, '$$$$') : str2);
};
