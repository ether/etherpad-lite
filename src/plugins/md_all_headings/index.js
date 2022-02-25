'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');
const Changeset = require('ep_etherpad-lite/static/js/Changeset');

exports.eejsBlock_editbarMenuLeft = (hookName, args, cb) => {
  args.content += eejs.require('ep_all_headings/templates/editbarButtons.ejs');
  return cb();
};

// Include CSS for HTML export
exports.stylesForExport = () => (
  // These should be consistent with client CSS.
  'h1{font-size: 2.5em;}\n' +
  'h2{font-size: 1.8em;}\n' +
  'h3{font-size: 1.5em;}\n' +
  'h4{font-size: 1.2em;}\n' +
  'code{font-family: RobotoMono;}\n');

const _analyzeLine = (alineAttrs, apool) => {
  let header = null;
  if (alineAttrs) {
    const opIter = Changeset.opIterator(alineAttrs);
    if (opIter.hasNext()) {
      const op = opIter.next();
      header = Changeset.opAttributeValue(op, 'heading', apool);
    }
  }
  return header;
};

// line, apool,attribLine,text
exports.getLineHTMLForExport = async (hookName, context) => {
  const header = _analyzeLine(context.attribLine, context.apool);
  if (header) {
    if (context.text.indexOf('*') === 0) {
      context.lineContent = context.lineContent.replace('*', '');
    }
    const paragraph = context.lineContent.match(/<p([^>]+)?>/);
    if (paragraph) {
      context.lineContent = context.lineContent.replace('<p', `<${header} `);
      context.lineContent = context.lineContent.replace('</p>', `</${header}>`);
    } else {
      context.lineContent = `<${header}>${context.lineContent}</${header}>`;
    }
    return context.lineContent;
  }
};
