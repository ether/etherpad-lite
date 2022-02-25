'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');
const Changeset = require('ep_etherpad-lite/static/js/Changeset');
const settings = require('ep_etherpad-lite/node/utils/Settings');

exports.eejsBlock_editbarMenuLeft = (hookName, args, cb) => {
  if (args.renderContext.isReadOnly) return cb();

  for (const button of ['alignLeft', 'alignJustify', 'alignCenter', 'alignRight']) {
    if (JSON.stringify(settings.toolbar).indexOf(button) > -1) {
      return cb();
    }
  }

  args.content += eejs.require('ep_align/templates/editbarButtons.ejs');
  return cb();
};

const _analyzeLine = (alineAttrs, apool) => {
  let alignment = null;
  if (alineAttrs) {
    const opIter = Changeset.opIterator(alineAttrs);
    if (opIter.hasNext()) {
      const op = opIter.next();
      alignment = Changeset.opAttributeValue(op, 'align', apool);
    }
  }
  return alignment;
};

// line, apool,attribLine,text
exports.getLineHTMLForExport = async (hookName, context) => {
  const align = _analyzeLine(context.attribLine, context.apool);
  if (align) {
    if (context.text.indexOf('*') === 0) {
      context.lineContent = context.lineContent.replace('*', '');
    }
    const heading = context.lineContent.match(/<h([1-6])([^>]+)?>/);

    if (heading) {
      if (heading.indexOf('style=') === -1) {
        context.lineContent = context.lineContent.replace('>', ` style='text-align:${align}'>`);
      } else {
        context.lineContent = context.lineContent.replace('style=', `style='text-align:${align} `);
      }
    } else {
      context.lineContent =
        `<p style='text-align:${align}'>${context.lineContent}</p>`;
    }
    return context.lineContent;
  }
};

exports.padInitToolbar = (hookName, args, cb) => {
  const toolbar = args.toolbar;

  const alignLeftButton = toolbar.button({
    command: 'alignLeft',
    localizationId: 'ep_align.toolbar.left.title',
    class: 'buttonicon buttonicon-align-left ep_align ep_align_left',
  });

  const alignCenterButton = toolbar.button({
    command: 'alignCenter',
    localizationId: 'ep_align.toolbar.middle.title',
    class: 'buttonicon buttonicon-align-center ep_align ep_align_center',
  });

  const alignJustifyButton = toolbar.button({
    command: 'alignJustify',
    localizationId: 'ep_align.toolbar.justify.title',
    class: 'buttonicon buttonicon-align-justify ep_align ep_align_justify',
  });

  const alignRightButton = toolbar.button({
    command: 'alignRight',
    localizationId: 'ep_align.toolbar.right.title',
    class: 'buttonicon buttonicon-align-right ep_align ep_align_right',
  });

  toolbar.registerButton('alignLeft', alignLeftButton);
  toolbar.registerButton('alignCenter', alignCenterButton);
  toolbar.registerButton('alignJustify', alignJustifyButton);
  toolbar.registerButton('alignRight', alignRightButton);

  return cb();
};
