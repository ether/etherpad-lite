'use strict';

// All our tags are block elements, so we just return them.
const tags = ['left', 'center', 'justify', 'right'];

const range = (start, end) => Array.from(
    Array(Math.abs(end - start) + 1),
    (_, i) => start + i
);

exports.aceRegisterBlockElements = () => tags;

// Bind the event handler to the toolbar buttons
exports.postAceInit = (hookName, context) => {
  $('body').on('click', '.ep_align', function () {
    const value = $(this).data('align');
    const intValue = parseInt(value, 10);
    if (!isNaN(intValue)) {
      context.ace.callWithAce((ace) => {
        ace.ace_doInsertAlign(intValue);
      }, 'insertalign', true);
    }
  });

  return;
};

// On caret position change show the current align
exports.aceEditEvent = (hook, call) => {
  // If it's not a click or a key event and the text hasn't changed then do nothing
  const cs = call.callstack;
  if (!(cs.type === 'handleClick') && !(cs.type === 'handleKeyEvent') && !(cs.docTextChanged)) {
    return false;
  }
  // If it's an initial setup event then do nothing..
  if (cs.type === 'setBaseText' || cs.type === 'setup') return false;

  // It looks like we should check to see if this section has this attribute
  return setTimeout(() => { // avoid race condition..
    const attributeManager = call.documentAttributeManager;
    const rep = call.rep;
    const activeAttributes = {};
    // $("#align-selection").val(-2); // TODO commented this out

    const firstLine = rep.selStart[0];
    const lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));
    let totalNumberOfLines = 0;

    range(firstLine, lastLine + 1).forEach((line) => {
      totalNumberOfLines++;
      const attr = attributeManager.getAttributeOnLine(line, 'align');
      if (!activeAttributes[attr]) {
        activeAttributes[attr] = {};
        activeAttributes[attr].count = 1;
      } else {
        activeAttributes[attr].count++;
      }
    });

    $.each(activeAttributes, (k, attr) => {
      if (attr.count === totalNumberOfLines) {
        // show as active class
        // const ind = tags.indexOf(k);
        // $("#align-selection").val(ind); // TODO commnented this out
      }
    });

    return;
  }, 250);
};

// Our align attribute will result in a heaading:left.... :left class
exports.aceAttribsToClasses = (hook, context) => {
  if (context.key === 'align') {
    return [`align:${context.value}`];
  }
};

// Here we convert the class align:left into a tag
exports.aceDomLineProcessLineAttributes = (name, context) => {
  const cls = context.cls;
  const alignType = /(?:^| )align:([A-Za-z0-9]*)/.exec(cls);
  let tagIndex;
  if (alignType) tagIndex = tags.indexOf(alignType[1]);
  if (tagIndex !== undefined && tagIndex >= 0) {
    const tag = tags[tagIndex];
    const styles =
      `width:100%;margin:0 auto;list-style-position:inside;display:block;text-align:${tag}`;
    const modifier = {
      preHtml: `<${tag} style="${styles}">`,
      postHtml: `</${tag}>`,
      processedMarker: true,
    };
    return [modifier];
  }
  return [];
};


// Once ace is initialized, we set ace_doInsertAlign and bind it to the context
exports.aceInitialized = (hook, context) => {
  // Passing a level >= 0 will set a alignment on the selected lines, level < 0
  // will remove it
  function doInsertAlign(level) {
    const rep = this.rep;
    const documentAttributeManager = this.documentAttributeManager;
    if (!(rep.selStart && rep.selEnd) || (level >= 0 && tags[level] === undefined)) {
      return;
    }

    const firstLine = rep.selStart[0];
    const lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));
    range(firstLine, lastLine).forEach((i) => {
      if (level >= 0) {
        documentAttributeManager.setAttributeOnLine(i, 'align', tags[level]);
      } else {
        documentAttributeManager.removeAttributeOnLine(i, 'align');
      }
    });
  }

  const editorInfo = context.editorInfo;
  editorInfo.ace_doInsertAlign = doInsertAlign.bind(context);
  return;
};

const align = (context, alignment) => {
  context.ace.callWithAce((ace) => {
    ace.ace_doInsertAlign(alignment);
    ace.ace_focus();
  }, 'insertalign', true);
};

exports.postToolbarInit = (hookName, context) => {
  const editbar = context.toolbar; // toolbar is actually editbar
  editbar.registerCommand('alignLeft', () => {
    align(context, 0);
  });

  editbar.registerCommand('alignCenter', () => {
    align(context, 1);
  });

  editbar.registerCommand('alignJustify', () => {
    align(context, 2);
  });

  editbar.registerCommand('alignRight', () => {
    align(context, 3);
  });

  return true;
};
