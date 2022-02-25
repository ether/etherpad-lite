if (typeof exports == 'undefined') {
  var exports = (this['mymodule'] = {});
}

var underscore = require('ep_etherpad-lite/static/js/underscore');
var padeditor = require('ep_etherpad-lite/static/js/pad_editor').padeditor;
var tags = ['checklist-not-done', 'checklist-done'];
var padEditor;

exports.checklist = {
  init: function (context) {
    // Write the button to the dom
    var buttonHTML =
      '<li class="acl-write" id="checklist"><a class="grouped-middle" data-l10n-id="pad.toolbar.checklist.title" title="Task list Checklist"><span class="buttonicon icon-check"></span></a></li>';
    // $(buttonHTML).insertBefore($('.buttonicon-indent').parent().parent());
    $(buttonHTML).insertAfter($('.icon-shuffle').parent().parent());
    $('#checklist').click(function () {
      // apply attribtes when we click the editbar button

      context.ace.callWithAce(
        function (ace) {
          // call the function to apply the attribute inside ACE
          ace.ace_doInsertchecklist();
        },
        'checklist',
        true,
      ); // TODO what's the second attribute do here?
      padeditor.ace.focus();
    });
    context.ace.callWithAce(
      function (ace) {
        var doc = ace.ace_getDocument();
        $(doc)
          .find('#innerdocbody')
          .on('click', underscore(exports.checklist.doUpdatechecklist).bind(ace));
      },
      'checklist',
      true,
    );
  },

  doInsertchecklist: function () {
    lineHasMarker = function (line) {
      if (
        line.domInfo.node.className === 'ace-line primary-null' ||
        line.domInfo.node.className === 'ace-line primary-none'
      ) {
        $.gritter.add({
          text: 'There is no content present to add checklist!',
        });
        return;
      } else {
        underscore(underscore.range(firstLine, lastLine + 1)).each(function (i) {
          // For each line, either turn on or off task list
          var ischecklist = documentAttributeManager.getAttributeOnLine(i, 'checklist-not-done');
          if (!ischecklist) {
            // if its already a checklist item
            documentAttributeManager.setAttributeOnLine(
              i,
              'checklist-not-done',
              'checklist-not-done',
            ); // make the line a task list
            return;
          } else {
            documentAttributeManager.removeAttributeOnLine(i, 'checklist-not-done'); // remove the task list from the line
            return;
          }
        });
        return;
      }
      return line.lineMarker === 1;
    };

    var rep = this.rep;

    var documentAttributeManager = this.documentAttributeManager;
    if (!(rep.selStart && rep.selEnd)) {
      return;
    } // only continue if we have some caret position
    var firstLine = rep.selStart[0]; // Get the first line
    var lastLine = Math.max(firstLine, rep.selEnd[0] - (rep.selEnd[1] === 0 ? 1 : 0)); // Get the last line
    console.log(lastLine);
    const line = rep.lines.atIndex(lastLine);
    lineHasMarker(line);
  },

  doTogglechecklistItem: function (lineNumber) {
    var rep = this.rep;
    var documentAttributeManager = this.documentAttributeManager;
    var isDone = documentAttributeManager.getAttributeOnLine(lineNumber, 'checklist-done');
    if (isDone) {
      documentAttributeManager.removeAttributeOnLine(lineNumber, 'checklist-done'); // remove the task list from the line
      documentAttributeManager.setAttributeOnLine(
        lineNumber,
        'checklist-not-done',
        'checklist-not-done',
      ); // make it undone
    } else {
      documentAttributeManager.removeAttributeOnLine(lineNumber, 'checklist-not-done'); // remove the task list from the line
      documentAttributeManager.setAttributeOnLine(lineNumber, 'checklist-done', 'checklist-done'); // make it done
    }
  },

  doUpdatechecklist: function (event) {
    // This is in the wrong context to access doc attr manager
    var ace = this;
    var target = event.target;
    var ischecklist =
      $(target).hasClass('checklist-not-done') || $(target).hasClass('checklist-done');
    var parent = $(target).parent();
    var lineNumber = parent.prevAll().length;
    var targetRight = event.target.offsetLeft + 14; // The right hand side of the checklist -- remember the checklist can be indented
    var isChecklist = event.pageX < targetRight; // was the click to the left of the checklist
    if (!ischecklist || !isChecklist) {
      return;
    } // Dont continue if we're not clicking a checklist of a checklist
    padEditor.callWithAce(
      function (ace) {
        // call the function to apply the attribute inside ACE
        ace.ace_doTogglechecklistItem(lineNumber);
      },
      'checklist',
      true,
    ); // TODO what's the second attribute do here?
  },
};

function aceInitialized(hook, context) {
  var editorInfo = context.editorInfo;
  editorInfo.ace_doInsertchecklist = underscore(exports.checklist.doInsertchecklist).bind(context); // What does underscore do here?
  editorInfo.ace_doTogglechecklistItem = underscore(exports.checklist.doTogglechecklistItem).bind(
    context,
  ); // TODO
  padEditor = context.editorInfo.editor;
}

var aceDomLineProcessLineAttributes = function (name, context) {
  if (context.cls.indexOf('checklist-not-done') !== -1) {
    var type = 'checklist-not-done';
  }
  if (context.cls.indexOf('checklist-done') !== -1) {
    var type = 'checklist-done';
  }
  var tagIndex = context.cls.indexOf(type);
  if (tagIndex !== undefined && type) {
    var tag = tags[tagIndex];
    var modifier = {
      preHtml: '<li class="' + type + '">',
      postHtml: '</li>',
      processedMarker: true,
    };
    return [modifier]; // return the modifier
  }
  return []; // or return nothing
};

exports.aceAttribsToClasses = function (hook, context) {
  if (context.key == 'checklist-not-done' || context.key == 'checklist-done') {
    return [context.value];
  }
};
exports.aceInitialized = aceInitialized;
exports.aceDomLineProcessLineAttributes = aceDomLineProcessLineAttributes;
exports.aceEditorCSS = function (hook_name, cb) {
  return ['/ep_checklist/static/css/checklist.css'];
}; // inner pad CSS
exports.postAceInit = function (hook, context) {
  exports.checklist.init(context);
};
