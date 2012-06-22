var _ = require('ep_etherpad-lite/static/js/underscore')._
  , padeditor = require('ep_etherpad-lite/static/js/pad_editor').padeditor
  , padeditbar = require('ep_etherpad-lite/static/js/pad_editbar').padeditbar;

function  registerCallWithAceCommand(commandName, callback) {
  padeditbar.registerToolbarCommand(commandName, function () {
    padeditor.ace.callWithAce(callback, commandName, true);
  });
}

exports.postAceInit = function () {
  var simpleCommands = ["bold", "italic", "underline", "strikethrough"]
    , undoRedoCommands = ["undo", "redo"];

  _.each(simpleCommands, function (commandName) {
    registerCallWithAceCommand(commandName, function (ace) {
      ace.ace_toggleAttributeOnSelection(commandName)
    });
  });

  _.each(undoRedoCommands, function (commandName) {
    registerCallWithAceCommand(commandName, function (ace) {
      ace.ace_doUndoRedo(commandName);
    });
  });

  registerCallWithAceCommand('insertunorderedlist', function (ace) {
    ace.ace_doInsertUnorderedList();
  });

  registerCallWithAceCommand("insertorderedlist", function (ace) {
    ace.ace_doInsertOrderedList();
  });

  registerCallWithAceCommand("indent", function (ace) {
    if (!ace.ace_doIndentOutdent(false)) {
      ace.ace_doInsertUnorderedList();
    }
  });

  registerCallWithAceCommand("outdent", function (ace) {
    ace.ace_doIndentOutdent(true);
  });

  registerCallWithAceCommand("clearauthorship", function (ace) {
    if ((!(ace.ace_getRep().selStart && ace.ace_getRep().selEnd)) || ace.ace_isCaret())
    {
      if (window.confirm("Clear authorship colors on entire document?"))
      {
        ace.ace_performDocumentApplyAttributesToCharRange(0, ace.ace_getRep().alltext.length, [
          ['author', '']
        ]);
      }
    }
    else
    {
      ace.ace_setAttributeOnSelection('author', '');
    }
  });
};
