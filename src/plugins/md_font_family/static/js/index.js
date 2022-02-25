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

/** ***
* Basic setup
******/

// Bind the event handler to the toolbar buttons
exports.postAceInit = (hook, context) => {
  const fontFamily = $('select.family-selection');
  $.each(fonts, (k, font) => {
    font = font.substring(4);
    let fontString = capitaliseFirstLetter(font);
    fontString = fontString.split('-').join(' ');
    fontFamily.append($('<option>').attr('value', `font${font}`).text(fontString));
  });
  fontFamily.niceSelect('update');
  fontFamily.on('change', function () {
    const value = $(this).val();
    context.ace.callWithAce((ace) => {
      // remove all other attrs
      $.each(fonts, (k, v) => {
        if (ace.ace_getAttributeOnSelection(v)) {
          ace.ace_setAttributeOnSelection(v, false);
        }
      });
      ace.ace_setAttributeOnSelection(value, true);
    }, 'insertfontFamily', true);
  });
};

// To do show what font family is active on current selection
exports.aceEditEvent = (hook, call) => {
  const cs = call.callstack;

  if (!(cs.type === 'handleClick') && !(cs.type === 'handleKeyEvent') && !(cs.docTextChanged)) {
    return false;
  }

  // If it's an initial setup event then do nothing..
  if (cs.type === 'setBaseText' || cs.type === 'setup') return false;
  // It looks like we should check to see if this section has this attribute
  setTimeout(() => { // avoid race condition..
    $('.family-selection').val('dummy'); // reset value to the dummy value

    // Attribtes are never available on the first X caret position so we need to ignore that
    if (call.rep.selStart[1] === 0) {
      // Attributes are never on the first line
      return;
    }
    // The line has an attribute set, this means it wont get hte correct X caret position
    if (call.rep.selStart[1] === 1) {
      if (call.rep.alltext[0] === '*') {
        // Attributes are never on the "first" character of lines with attributes
        return;
      }
    }
    // the caret is in a new position.. Let's do some funky shit
    $('.subscript > a').removeClass('activeButton');
    $.each(fonts, (k, v) => {
      if (call.editorInfo.ace_getAttributeOnSelection(v)) {
        // show the button as being depressed.. Not sad, but active..
        $('.family-selection').val(v);
      }
    });
  }, 250);
};

/** ***
* Editor setup
******/

// Our fontFamily attribute will result in a class
exports.aceAttribsToClasses = (hook, context) => {
  if (fonts.indexOf(context.key) !== -1) {
    return [context.key];
  }
};

// Block elements
exports.aceRegisterBlockElements = () => fonts;

// Register attributes that are html markup / blocks not just classes
// This should make export export properly IE <sub>helllo</sub>world
// will be the output and not <span class=sub>helllo</span>
exports.aceAttribClasses = (hookName, attr) => {
  $.each(fonts, (k, v) => {
    attr[v] = `tag:${v}`;
  });
  return attr;
};

exports.aceEditorCSS = (hookName, cb) => ['/ep_font_family/static/css/fonts.css'];

const capitaliseFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1);
