/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

/**
 * Copyright 2009 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var padutils = require('./pad_utils').padutils;
var padeditor = require('./pad_editor').padeditor;
var padsavedrevs = require('./pad_savedrevs');

var padeditbar = (function()
{

  var syncAnimation = (function()
  {
    var SYNCING = -100;
    var DONE = 100;
    var state = DONE;
    var fps = 25;
    var step = 1 / fps;
    var T_START = -0.5;
    var T_FADE = 1.0;
    var T_GONE = 1.5;
    var animator = padutils.makeAnimationScheduler(function()
    {
      if (state == SYNCING || state == DONE)
      {
        return false;
      }
      else if (state >= T_GONE)
      {
        state = DONE;
        $("#syncstatussyncing").css('display', 'none');
        $("#syncstatusdone").css('display', 'none');
        return false;
      }
      else if (state < 0)
      {
        state += step;
        if (state >= 0)
        {
          $("#syncstatussyncing").css('display', 'none');
          $("#syncstatusdone").css('display', 'block').css('opacity', 1);
        }
        return true;
      }
      else
      {
        state += step;
        if (state >= T_FADE)
        {
          $("#syncstatusdone").css('opacity', (T_GONE - state) / (T_GONE - T_FADE));
        }
        return true;
      }
    }, step * 1000);
    return {
      syncing: function()
      {
        state = SYNCING;
        $("#syncstatussyncing").css('display', 'block');
        $("#syncstatusdone").css('display', 'none');
      },
      done: function()
      {
        state = T_START;
        animator.scheduleAnimation();
      }
    };
  }());

  var self = {
    init: function() {
      var self = this;
      $("#editbar .editbarbutton").attr("unselectable", "on"); // for IE
      $("#editbar").removeClass("disabledtoolbar").addClass("enabledtoolbar");
      $("#editbar [data-key]").each(function (i, e) {
        $(e).click(function (event) {
          self.toolbarClick($(e).attr('data-key'));
          event.preventDefault();
        });
      });
    },
    isEnabled: function()
    {
//      return !$("#editbar").hasClass('disabledtoolbar');
      return true;
    },
    disable: function()
    {
      $("#editbar").addClass('disabledtoolbar').removeClass("enabledtoolbar");
    },
    commands: {},
    registerCommand: function (cmd, callback) {
      this.commands[cmd] = callback;
      return this;
    },
    registerDropdownCommand: function (cmd, dropdown) {
      dropdown = dropdown || cmd;
      this.registerCommand(cmd, function () {
        self.toggleDropDown(dropdown);
      });
    },
    registerAceCommand: function (cmd, callback) {
      this.registerCommand(cmd, function (cmd, ace) {
        ace.callWithAce(function (ace) {
          callback(cmd, ace);
        }, cmd, true);
      });
    },
    toolbarClick: function(cmd)
    {
      if (self.isEnabled())
      {
        if (this.commands[cmd]) {
          this.commands[cmd](cmd, padeditor.ace);
        }
        else {
          console.log("Command doesn't exist", cmd);
        }
      }
      if(padeditor.ace) padeditor.ace.focus();
    },
    toggleDropDown: function(moduleName, cb)
    {
      var modules = ["settings", "connectivity", "importexport", "embed", "users"];

      // hide all modules and remove highlighting of all buttons
      if(moduleName == "none")
      {
        var returned = false
        for(var i=0;i<modules.length;i++)
        {
          //skip the userlist
          if(modules[i] == "users")
            continue;

          var module = $("#" + modules[i]);

          if(module.css('display') != "none")
          {
            $("#" + modules[i] + "link").removeClass("selected");
            module.slideUp("fast", cb);
            returned = true;
          }
        }
        if(!returned && cb) return cb();
      }
      else
      {
        // hide all modules that are not selected and remove highlighting
        // respectively add highlighting to the corresponding button
        for(var i=0;i<modules.length;i++)
        {
          var module = $("#" + modules[i]);

          if(module.css('display') != "none")
          {
            $("#" + modules[i] + "link").removeClass("selected");
            module.slideUp("fast");
          }
          else if(modules[i]==moduleName)
          {
            $("#" + modules[i] + "link").addClass("selected");
            module.slideDown("fast", cb);
          }
        }
      }
    },
    setSyncStatus: function(status)
    {
      if (status == "syncing")
      {
        syncAnimation.syncing();
      }
      else if (status == "done")
      {
        syncAnimation.done();
      }
    },
    setEmbedLinks: function()
    {
      if ($('#readonlyinput').is(':checked'))
      {
        var basePath = document.location.href.substring(0, document.location.href.indexOf("/p/"));
        var readonlyLink = basePath + "/p/" + clientVars.readOnlyId;
        $('#embedinput').val("<iframe name='embed_readonly' src='" + readonlyLink + "?showControls=true&showChat=true&showLineNumbers=true&useMonospaceFont=false' width=600 height=400></iframe>");
        $('#linkinput').val(readonlyLink);
      }
      else
      {
        var padurl = window.location.href.split("?")[0];
        $('#embedinput').val("<iframe name='embed_readwrite' src='" + padurl + "?showControls=true&showChat=true&showLineNumbers=true&useMonospaceFont=false' width=600 height=400></iframe>");
        $('#linkinput').val(padurl);
      }
    }
  };

  self.registerDropdownCommand("showusers", "users");
  self.registerDropdownCommand("settings");
  self.registerDropdownCommand("connectivity");
  self.registerDropdownCommand("import_export", "importexport");

  self.registerCommand("embed", function () {
    self.setEmbedLinks();
    $('#linkinput').focus().select();
    self.toggleDropDown("embed");
  });

  self.registerCommand("savedRevision", function () {
    padsavedrevs.saveNow();
  });

  self.registerCommand("showTimeSlider", function () {
    document.location = document.location + "/timeslider";
  });

  function aceAttributeCommand (cmd, ace) {
    ace.ace_toggleAttributeOnSelection(cmd);
  }

  self.registerAceCommand("bold", aceAttributeCommand);
  self.registerAceCommand("italic", aceAttributeCommand);
  self.registerAceCommand("underline", aceAttributeCommand);
  self.registerAceCommand("strikethrough", aceAttributeCommand);

  self.registerAceCommand("undo", function (cmd, ace) {
    ace.ace_doUndoRedo(cmd);
  });

  self.registerAceCommand("redo", function (cmd) {
    ace.ace_doUndoRedo(cmd);
  });

  self.registerAceCommand("insertunorderedlist", function (cmd, ace) {
    ace.ace_doInsertUnorderedList();
  });

  self.registerAceCommand("insertorderedlist", function (cmd, ace) {
    ace.ace_doInsertOrderedList();
  });

  self.registerAceCommand("indent", function (cmd, ace) {
    if (!ace.ace_doIndentOutdent(false)) {
      ace.ace_doInsertUnorderedList();
    }
  });

  self.registerAceCommand("outdent", function (cmd, ace) {
    ace.ace_doIndentOutdent(true);
  });

  self.registerAceCommand("clearauthorship", function (cmd, ace) {
    if ((!(ace.ace_getRep().selStart && ace.ace_getRep().selEnd)) || ace.ace_isCaret()) {
      if (window.confirm(html10n.get("pad.editbar.clearcolors"))) {
        ace.ace_performDocumentApplyAttributesToCharRange(0, ace.ace_getRep().alltext.length, [
          ['author', '']
        ]);
      }
    }
    else {
      ace.ace_setAttributeOnSelection('author', '');
    }
  });

  return self;
}());

exports.padeditbar = padeditbar;
