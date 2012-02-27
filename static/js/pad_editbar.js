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

var padutils      = require('/pad_utils').padutils,
    padeditor     = require('/pad_editor').padeditor,
    padsavedrevs  = require('/pad_savedrevs').padsavedrevs;

function indexOf(array, value) {
  for (var i=0, ii=array.length; i < ii; i++) {
    if (array[i] == value)
      return i;
  }
  return -1;
}

var padeditbar = (function() {
  var syncAnimation = (function() {
    var SYNCING = -100,
        DONE    = 100,
        state   = DONE,
        fps     = 25,
        step    = 1 / fps,
        T_START = -0.5,
        T_FADE  = 1.0,
        T_GONE  = 1.5;
    var animator = padutils.makeAnimationScheduler(function() {
      if (state == SYNCING || state == DONE)
        return false;
      else if (state >= T_GONE) {
        state = DONE;
        $('#syncstatussyncing, #syncstatusdone').hide();
        return false;
      } else if (state < 0) {
        state += step;
        if (state >= 0) {
          $('#syncstatussyncing').hide();
          $('#syncstatusdone').show().css({opacity: 1});
        }
        return true;
      } else {
        state += step;
        if (state >= T_FADE)
          $('#syncstatusdone').css('opacity', (T_GONE - state) / (T_GONE - T_FADE));
        return true;
      }
    }, step * 1000);
    return {
      syncing: function() {
        state = SYNCING;
        $('#syncstatussyncing').show();
        $('#syncstatusdone').hide();
      },
      done: function() {
        state = T_START;
        animator.scheduleAnimation();
      }
    };
  }());

  var self = {
    init: function() {
      $('#editbar A').attr('unselectable', 'on'); // for IE
      $('#editbar').removeClass('disabledtoolbar').addClass('enabledtoolbar');
    },
    isEnabled: function() {
//      return !$("#editbar").hasClass('disabledtoolbar');
      return true;
    },
    disable: function() {
      $('#editbar').addClass('disabledtoolbar').removeClass('enabledtoolbar');
    },
    toolbarClick: function(cmd) {
      if (self.isEnabled()) {
        switch(cmd) {
          case 'users':
            self.toggleDropDown('users');
            break;
          case 'settings':
            self.toggleDropDown('settings');
            break;
          case 'embed':
            self.setEmbedLinks();
            self.toggleDropDown('embed');
            break;
          case 'importexport':
            self.toggleDropDown('importexport');
            break;
          case 'save':
            padsavedrevs.saveNow();
            break;
          default:
            padeditor.ace.callWithAce(function(ace) {
              if (cmd == 'bold' || cmd == 'italic' || cmd == 'underline' || cmd == 'strikethrough')
                ace.ace_toggleAttributeOnSelection(cmd);
              else if (cmd == 'undo' || cmd == 'redo')
                ace.ace_doUndoRedo(cmd);
              else if (cmd == 'insertunorderedlist')
                ace.ace_doInsertUnorderedList();
              else if (cmd == 'insertorderedlist')
                ace.ace_doInsertOrderedList();
              else if (cmd == 'indent') {
                if (!ace.ace_doIndentOutdent(false))
                  ace.ace_doInsertUnorderedList();
              } else if (cmd == 'outdent')
                ace.ace_doIndentOutdent(true);
              else if (cmd == 'clearauthorship') {
                if ((!(ace.ace_getRep().selStart && ace.ace_getRep().selEnd)) || ace.ace_isCaret()) {
                  if (window.confirm("Clear authorship colors on entire document?")) {
                    ace.ace_performDocumentApplyAttributesToCharRange(0, ace.ace_getRep().alltext.length, [
                      ['author', '']
                    ]);
                  }
                } else {
                  ace.ace_setAttributeOnSelection('author', '');
                }
              }
            }, cmd, true);
        }
      }
      if (padeditor.ace)
        padeditor.ace.focus();
    },
    toggleDropDown: function(moduleName) {
      var modules = ['settings', 'importexport', 'embed', 'users'],
          $module, i, l;
      $('#editbar UL.right LI').removeClass('selected');
      // hide all modules if no module was passed to this method
      if (moduleName == 'none') {
        for (i=0, l=modules.length; i < l; i++) {
          // skip the userlist
          if (modules[i] == 'users')
            continue;
          $module = $('#' + modules[i] + 'menu');
          if ($module.is(':visible'))
            $module.slideUp(250);
        }
      } else {
        // hide all modules that are not selected and show the selected one
        for (i=0, l=modules.length; i < l; i++) {
          $module = $('#' + modules[i] + 'menu');
          if ($module.is(':visible'))
            $module.slideUp(250);
          else if (modules[i] == moduleName) {
            $module.slideDown(250);
            $('#' + modules[i]).addClass('selected');
          }
        }
      }
    },
    setSyncStatus: function(status) {
      if (status == 'syncing')
        syncAnimation.syncing();
      else if (status == 'done')
        syncAnimation.done();
    },
    setEmbedLinks: function() {
      if ($('#readonlyinput').is(':checked')) {
        var basePath      = document.location.href.substring(0, document.location.href.indexOf('/p/')),
            readonlyLink  = basePath + '/ro/' + clientVars.readOnlyId;
        $('#embedinput').val("<iframe src='" + readonlyLink + "?showControls=true&showChat=true&showLineNumbers=true&useMonospaceFont=false' width=600 height=400>");
        $('#linkinput').val(readonlyLink);
        $('#embedreadonlyqr').attr('src', 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chld=H|0&chl=' + readonlyLink);
      } else {
        var padurl = window.location.href.split('?')[0];
        $('#embedinput').val("<iframe src='" + padurl + "?showControls=true&showChat=true&showLineNumbers=true&useMonospaceFont=false' width=600 height=400>");
        $('#linkinput').val(padurl);
        $('#embedreadonlyqr').attr('src', "https://chart.googleapis.com/chart?chs=200x200&cht=qr&chld=H|0&chl=" + padurl);
      }
    }
  };
  return self;
}());

exports.padeditbar = padeditbar;