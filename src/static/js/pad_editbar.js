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

var hooks = require('./pluginfw/hooks');
var padutils = require('./pad_utils').padutils;
var padeditor = require('./pad_editor').padeditor;
var padsavedrevs = require('./pad_savedrevs');

var ToolbarItem = function (element) {
  this.$el = element;
};

ToolbarItem.prototype.getCommand = function () {
  return this.$el.attr("data-key");
};

ToolbarItem.prototype.getValue = function () {
  if (this.isSelect()) {
    return this.$el.find("select").val();
  }
};

ToolbarItem.prototype.setValue = function (val) {
  if (this.isSelect()) {
    return this.$el.find("select").val(val);
  }
};


ToolbarItem.prototype.getType = function () {
  return this.$el.attr("data-type");
};

ToolbarItem.prototype.isSelect = function () {
  return this.getType() == "select";
};

ToolbarItem.prototype.isButton = function () {
  return this.getType() == "button";
};

ToolbarItem.prototype.bind = function (callback) {
  var self = this;

  if (self.isButton()) {
    self.$el.click(function (event) {
      callback(self.getCommand(), self);
      event.preventDefault();
    });
  }
  else if (self.isSelect()) {
    self.$el.find("select").change(function () {
      callback(self.getCommand(), self);
    });
  }
};


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
      self.dropdowns = [];
      // Listen for resize events (sucks but needed as iFrame ace_inner has to be position absolute
      // A CSS fix for this would be nice but I'm not sure how we'd do it.
      $(window).resize(function(){
        self.redrawHeight();
      });

      $("#editbar .editbarbutton").attr("unselectable", "on"); // for IE
      $("#editbar").removeClass("disabledtoolbar").addClass("enabledtoolbar");
      $("#editbar [data-key]").each(function () {
        $(this).unbind("click");
        (new ToolbarItem($(this))).bind(function (command, item) {
          self.triggerCommand(command, item);
        });
      });

      $('#editbar').show();

      this.redrawHeight();

      registerDefaultCommands(self);

      hooks.callAll("postToolbarInit", {
        toolbar: self,
        ace: padeditor.ace
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
    redrawHeight: function(){
      var editbarHeight = $('.menu_left').height() + 1 + "px";
      var containerTop = $('.menu_left').height() + 6 + "px";
      $('#editbar').css("height", editbarHeight);

      $('#editorcontainer').css("top", containerTop);
      if($('#options-stickychat').is(":checked")){
        $('#chatbox').css("top", $('#editorcontainer').offset().top + "px");
      };
    },
    registerDropdownCommand: function (cmd, dropdown) {
      dropdown = dropdown || cmd;
      self.dropdowns.push(dropdown)
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
    triggerCommand: function (cmd, item) {
      if (self.isEnabled() && this.commands[cmd]) {
        this.commands[cmd](cmd, padeditor.ace, item);
      }
      if(padeditor.ace) padeditor.ace.focus();
    },
    toggleDropDown: function(moduleName, cb)
    {
      // hide all modules and remove highlighting of all buttons
      if(moduleName == "none")
      {
        var returned = false
        for(var i=0;i<self.dropdowns.length;i++)
        {
          //skip the userlist
          if(self.dropdowns[i] == "users")
            continue;

          var module = $("#" + self.dropdowns[i]);

          if(module.css('display') != "none")
          {
            $("li[data-key=" + self.dropdowns[i] + "] > a").removeClass("selected");
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
        for(var i=0;i<self.dropdowns.length;i++)
        {
          var module = $("#" + self.dropdowns[i]);

          if(module.css('display') != "none")
          {
            $("li[data-key=" + self.dropdowns[i] + "] > a").removeClass("selected");
            module.slideUp("fast");
          }
          else if(self.dropdowns[i]==moduleName)
          {
            $("li[data-key=" + self.dropdowns[i] + "] > a").addClass("selected");
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

  function aceAttributeCommand(cmd, ace) {
    ace.ace_toggleAttributeOnSelection(cmd);
  }

  function registerDefaultCommands(toolbar) {
    toolbar.registerDropdownCommand("showusers", "users");
    toolbar.registerDropdownCommand("settings");
    toolbar.registerDropdownCommand("connectivity");
    toolbar.registerDropdownCommand("import_export");
    toolbar.registerDropdownCommand("embed");

    toolbar.registerCommand("embed", function () {
      toolbar.setEmbedLinks();
      $('#linkinput').focus().select();
      toolbar.toggleDropDown("embed");
    });

    toolbar.registerCommand("savedRevision", function () {
      padsavedrevs.saveNow();
    });

    toolbar.registerCommand("showTimeSlider", function () {
      document.location = document.location.pathname+ '/timeslider';
    });

    toolbar.registerAceCommand("bold", aceAttributeCommand);
    toolbar.registerAceCommand("italic", aceAttributeCommand);
    toolbar.registerAceCommand("underline", aceAttributeCommand);
    toolbar.registerAceCommand("strikethrough", aceAttributeCommand);

    toolbar.registerAceCommand("undo", function (cmd, ace) {
      ace.ace_doUndoRedo(cmd);
    });

    toolbar.registerAceCommand("redo", function (cmd, ace) {
      ace.ace_doUndoRedo(cmd);
    });

    toolbar.registerAceCommand("insertunorderedlist", function (cmd, ace) {
      ace.ace_doInsertUnorderedList();
    });

    toolbar.registerAceCommand("insertorderedlist", function (cmd, ace) {
      ace.ace_doInsertOrderedList();
    });

    toolbar.registerAceCommand("indent", function (cmd, ace) {
      if (!ace.ace_doIndentOutdent(false)) {
        ace.ace_doInsertUnorderedList();
      }
    });

    toolbar.registerAceCommand("outdent", function (cmd, ace) {
      ace.ace_doIndentOutdent(true);
    });

    toolbar.registerAceCommand("clearauthorship", function (cmd, ace) {
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

    toolbar.registerCommand('timeslider_returnToPad', function(cmd) {
      if( document.referrer.length > 0 && document.referrer.substring(document.referrer.lastIndexOf("/")-1, document.referrer.lastIndexOf("/")) === "p") {
        document.location = document.referrer;
      } else {
        document.location = document.location.href.substring(0,document.location.href.lastIndexOf("/"));
      }
    });
  }

  return self;
}());

exports.padeditbar = padeditbar;
