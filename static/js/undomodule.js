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


undoModule = (function() {
  var stack = (function() {
    var stackElements = [];
    // two types of stackElements:
    // 1) { elementType: UNDOABLE_EVENT, eventType: "anything", [backset: <changeset>,]
    //      [selStart: <char number>, selEnd: <char number>, selFocusAtStart: <boolean>] }
    // 2) { elementType: EXTERNAL_CHANGE, changeset: <changeset> }
    // invariant: no two consecutive EXTERNAL_CHANGEs
    var numUndoableEvents = 0;

    var UNDOABLE_EVENT = "undoableEvent";
    var EXTERNAL_CHANGE = "externalChange";

    function clearStack() {
      stackElements.length = 0;
      stackElements.push({ elementType: UNDOABLE_EVENT, eventType: "bottom" });
      numUndoableEvents = 1;
    }
    clearStack();

    function pushEvent(event) {
      var e = extend({}, event);
      e.elementType = UNDOABLE_EVENT;
      stackElements.push(e);
      numUndoableEvents++;
      //dmesg("pushEvent backset: "+event.backset);
    }

    function pushExternalChange(cs) {
      var idx = stackElements.length-1;
      if (stackElements[idx].elementType == EXTERNAL_CHANGE) {
	stackElements[idx].changeset = Changeset.compose(stackElements[idx].changeset, cs, getAPool());
      }
      else {
	stackElements.push({elementType: EXTERNAL_CHANGE, changeset: cs});
      }
    }

    function _exposeEvent(nthFromTop) {
      // precond: 0 <= nthFromTop < numUndoableEvents
      var targetIndex = stackElements.length - 1 - nthFromTop;
      var idx = stackElements.length - 1;
      while (idx > targetIndex || stackElements[idx].elementType == EXTERNAL_CHANGE) {
	if (stackElements[idx].elementType == EXTERNAL_CHANGE) {
	  var ex = stackElements[idx];
	  var un = stackElements[idx-1];
	  if (un.backset) {
	    var excs = ex.changeset;
	    var unbs = un.backset;
	    un.backset = Changeset.follow(excs, un.backset, false, getAPool());
	    ex.changeset = Changeset.follow(unbs, ex.changeset, true, getAPool());
	    if ((typeof un.selStart) == "number") {
	      var newSel = Changeset.characterRangeFollow(excs, un.selStart, un.selEnd);
	      un.selStart = newSel[0];
	      un.selEnd = newSel[1];
	      if (un.selStart == un.selEnd) {
		un.selFocusAtStart = false;
	      }
	    }
	  }
	  stackElements[idx-1] = ex;
	  stackElements[idx] = un;
	  if (idx >= 2 && stackElements[idx-2].elementType == EXTERNAL_CHANGE) {
	    ex.changeset = Changeset.compose(stackElements[idx-2].changeset,
					     ex.changeset, getAPool());
	    stackElements.splice(idx-2, 1);
	    idx--;
	  }
	}
	else {
	  idx--;
	}
      }
    }

    function getNthFromTop(n) {
      // precond: 0 <= n < numEvents()
      _exposeEvent(n);
      return stackElements[stackElements.length - 1 - n];
    }

    function numEvents() {
      return numUndoableEvents;
    }

    function popEvent() {
      // precond: numEvents() > 0
      _exposeEvent(0);
      numUndoableEvents--;
      return stackElements.pop();
    }

    return {numEvents:numEvents, popEvent:popEvent, pushEvent: pushEvent,
	    pushExternalChange: pushExternalChange, clearStack: clearStack,
	    getNthFromTop:getNthFromTop};
  })();

  // invariant: stack always has at least one undoable event

  var undoPtr = 0; // zero-index from top of stack, 0 == top

  function clearHistory() {
    stack.clearStack();
    undoPtr = 0;
  }

  function _charOccurrences(str, c) {
    var i = 0;
    var count = 0;
    while (i >= 0 && i < str.length) {
      i = str.indexOf(c, i);
      if (i >= 0) {
	count++;
	i++;
      }
    }
    return count;
  }

  function _opcodeOccurrences(cs, opcode) {
    return _charOccurrences(Changeset.unpack(cs).ops, opcode);
  }

  function _mergeChangesets(cs1, cs2) {
    if (! cs1) return cs2;
    if (! cs2) return cs1;

    // Rough heuristic for whether changesets should be considered one action:
    // each does exactly one insertion, no dels, and the composition does also; or
    // each does exactly one deletion, no ins, and the composition does also.
    // A little weird in that it won't merge "make bold" with "insert char"
    // but will merge "make bold and insert char" with "insert char",
    // though that isn't expected to come up.
    var plusCount1 = _opcodeOccurrences(cs1, '+');
    var plusCount2 = _opcodeOccurrences(cs2, '+');
    var minusCount1 = _opcodeOccurrences(cs1, '-');
    var minusCount2 = _opcodeOccurrences(cs2, '-');
    if (plusCount1 == 1 && plusCount2 == 1 && minusCount1 == 0 && minusCount2 == 0) {
      var merge = Changeset.compose(cs1, cs2, getAPool());
      var plusCount3 = _opcodeOccurrences(merge, '+');
      var minusCount3 = _opcodeOccurrences(merge, '-');
      if (plusCount3 == 1 && minusCount3 == 0) {
	return merge;
      }
    }
    else if (plusCount1 == 0 && plusCount2 == 0 && minusCount1 == 1 && minusCount2 == 1) {
      var merge = Changeset.compose(cs1, cs2, getAPool());
      var plusCount3 = _opcodeOccurrences(merge, '+');
      var minusCount3 = _opcodeOccurrences(merge, '-');
      if (plusCount3 == 0 && minusCount3 == 1) {
	return merge;
      }
    }
    return null;
  }

  function reportEvent(event) {
    var topEvent = stack.getNthFromTop(0);

    function applySelectionToTop() {
      if ((typeof event.selStart) == "number") {
	topEvent.selStart = event.selStart;
	topEvent.selEnd = event.selEnd;
	topEvent.selFocusAtStart = event.selFocusAtStart;
      }
    }

    if ((! event.backset) || Changeset.isIdentity(event.backset)) {
      applySelectionToTop();
    }
    else {
      var merged = false;
      if (topEvent.eventType == event.eventType) {
	var merge = _mergeChangesets(event.backset, topEvent.backset);
	if (merge) {
	  topEvent.backset = merge;
	  //dmesg("reportEvent merge: "+merge);
	  applySelectionToTop();
	  merged = true;
	}
      }
      if (! merged) {
	stack.pushEvent(event);
      }
      undoPtr = 0;
    }

  }

  function reportExternalChange(changeset) {
    if (changeset && ! Changeset.isIdentity(changeset)) {
      stack.pushExternalChange(changeset);
    }
  }

  function _getSelectionInfo(event) {
    if ((typeof event.selStart) != "number") {
      return null;
    }
    else {
      return {selStart: event.selStart, selEnd: event.selEnd,
	      selFocusAtStart: event.selFocusAtStart};
    }
  }

  // For "undo" and "redo", the change event must be returned
  // by eventFunc and NOT reported through the normal mechanism.
  // "eventFunc" should take a changeset and an optional selection info object,
  // or can be called with no arguments to mean that no undo is possible.
  // "eventFunc" will be called exactly once.

  function performUndo(eventFunc) {
    if (undoPtr < stack.numEvents()-1) {
      var backsetEvent = stack.getNthFromTop(undoPtr);
      var selectionEvent = stack.getNthFromTop(undoPtr+1);
      var undoEvent = eventFunc(backsetEvent.backset, _getSelectionInfo(selectionEvent));
      stack.pushEvent(undoEvent);
      undoPtr += 2;
    }
    else eventFunc();
  }

  function performRedo(eventFunc) {
    if (undoPtr >= 2) {
      var backsetEvent = stack.getNthFromTop(0);
      var selectionEvent = stack.getNthFromTop(1);
      eventFunc(backsetEvent.backset, _getSelectionInfo(selectionEvent));
      stack.popEvent();
      undoPtr -= 2;
    }
    else eventFunc();
  }

  function getAPool() {
    return undoModule.apool;
  }

  return {clearHistory:clearHistory, reportEvent:reportEvent, reportExternalChange:reportExternalChange,
	  performUndo:performUndo, performRedo:performRedo, enabled: true,
          apool: null}; // apool is filled in by caller
})();