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


var padeditbar = (function(){

  var syncAnimation = (function() {
    var SYNCING = -100;
    var DONE = 100;
    var state = DONE;
    var fps = 25;
    var step = 1/fps;
    var T_START = -0.5;
    var T_FADE = 1.0;
    var T_GONE = 1.5;
    var animator = padutils.makeAnimationScheduler(function() {
      if (state == SYNCING || state == DONE) {
        return false;
      }
      else if (state >= T_GONE) {
        state = DONE;
        $("#syncstatussyncing").css('display', 'none');
        $("#syncstatusdone").css('display', 'none');
        return false;
      }
      else if (state < 0) {
        state += step;
        if (state >= 0) {
          $("#syncstatussyncing").css('display', 'none');
          $("#syncstatusdone").css('display', 'block').css('opacity', 1);
        }
        return true;
      }
      else {
        state += step;
        if (state >= T_FADE) {
          $("#syncstatusdone").css('opacity', (T_GONE - state) / (T_GONE - T_FADE));
        }
        return true;
      }
    }, step*1000);
    return {
      syncing: function() {
        state = SYNCING;
        $("#syncstatussyncing").css('display', 'block');
        $("#syncstatusdone").css('display', 'none');
      },
      done: function() {
        state = T_START;
        animator.scheduleAnimation();
      }
    };
  }());

  var self = {
    init: function() {
      $("#editbar .editbarbutton").attr("unselectable", "on"); // for IE
      $("#editbar").removeClass("disabledtoolbar").addClass("enabledtoolbar");
    },
    isEnabled: function() {
      return ! $("#editbar").hasClass('disabledtoolbar');
    },
    disable: function() {
      $("#editbar").addClass('disabledtoolbar').removeClass("enabledtoolbar");
    },
    toolbarClick: function(cmd) {
      if (self.isEnabled()) {
        if (cmd == 'save') {
          padsavedrevs.saveNow();
        } else {
	  padeditor.ace.callWithAce(function (ace) {
	    if (cmd == 'bold' || cmd == 'italic' || cmd == 'underline' || cmd == 'strikethrough')
	      ace.ace_toggleAttributeOnSelection(cmd);
            else if (cmd == 'undo' || cmd == 'redo') 
	      ace.ace_doUndoRedo(cmd);
            else if (cmd == 'insertunorderedlist') 
	      ace.ace_doInsertUnorderedList();
            else if (cmd == 'indent') {
	      if (! ace.ace_doIndentOutdent(false)) {
	       ace.ace_doInsertUnorderedList();
	      }
	    } else if (cmd == 'outdent') {
              ace.ace_doIndentOutdent(true);
	    } else if (cmd == 'clearauthorship') {
	      if ((!(ace.ace_getRep().selStart && ace.ace_getRep().selEnd)) || ace.ace_isCaret()) {
		if (window.confirm("Clear authorship colors on entire document?")) {
		  ace.ace_performDocumentApplyAttributesToCharRange(0, ace.ace_getRep().alltext.length,
							    [['author', '']]);
		}
	      } else {
		ace.ace_setAttributeOnSelection('author', '');
	      }
	    }
	  }, cmd, true);
        }
      }
      padeditor.ace.focus();
    },
    setSyncStatus: function(status) {
      if (status == "syncing") {
        syncAnimation.syncing();
      }
      else if (status == "done") {
        syncAnimation.done();
      }
    }
  };
  return self;
}());