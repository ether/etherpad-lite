'use strict';

/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

import {RepModel} from "./types/RepModel";

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

const Changeset = require('./Changeset');
import {extend} from 'underscore'
import AttributePool from "./AttributePool";

export let pool: AttributePool|null = null


export const setPool = (poolAssigned: AttributePool)=> {
  pool = poolAssigned
}
class Stack {
  private numUndoableEvents = 0
  private UNDOABLE_EVENT = 'undoableEvent';
  private EXTERNAL_CHANGE = 'externalChange';
  private stackElements: any[] = []

  constructor() {
    // two types of stackElements:
    // 1) { elementType: UNDOABLE_EVENT, eventType: "anything", [backset: <changeset>,]
    //      [selStart: <char number>, selEnd: <char number>, selFocusAtStart: <boolean>] }
    // 2) { elementType: EXTERNAL_CHANGE, changeset: <changeset> }
    // invariant: no two consecutive EXTERNAL_CHANGEs
    this.clearStack();
  }
  clearStack = () => {
    this.stackElements.length = 0;
    this.stackElements.push(
      {
        elementType: this.UNDOABLE_EVENT,
        eventType: 'bottom',
      });
    this.numUndoableEvents = 1;
  };
  pushEvent = (event: string) => {
    const e = extend(
      {}, event);
    e.elementType = this.UNDOABLE_EVENT;
    this.stackElements.push(e);
    this.numUndoableEvents++;
  }
  pushExternalChange = (cs: string) => {
    const idx = this.stackElements.length - 1;
    if (this.stackElements[idx].elementType === this.EXTERNAL_CHANGE) {
      this.stackElements[idx].changeset =
        Changeset.compose(this.stackElements[idx].changeset, cs, pool);
    } else {
      this.stackElements.push(
        {
          elementType: this.EXTERNAL_CHANGE,
          changeset: cs,
        });
    }
  }

  private exposeEvent = (nthFromTop: number) => {
    // precond: 0 <= nthFromTop < numUndoableEvents
    const targetIndex = this.stackElements.length - 1 - nthFromTop;
    let idx = this.stackElements.length - 1;
    while (idx > targetIndex || this.stackElements[idx].elementType === this.EXTERNAL_CHANGE) {
      if (this.stackElements[idx].elementType === this.EXTERNAL_CHANGE) {
        const ex = this.stackElements[idx];
        const un = this.stackElements[idx - 1];
        if (un.backset) {
          const excs = ex.changeset;
          const unbs = un.backset;
          un.backset = Changeset.follow(excs, un.backset, false, pool);
          ex.changeset = Changeset.follow(unbs, ex.changeset, true, pool);
          if ((typeof un.selStart) === 'number') {
            const newSel = Changeset.characterRangeFollow(excs, un.selStart, un.selEnd);
            un.selStart = newSel[0];
            un.selEnd = newSel[1];
            if (un.selStart === un.selEnd) {
              un.selFocusAtStart = false;
            }
          }
        }
        this.stackElements[idx - 1] = ex;
        this.stackElements[idx] = un;
        if (idx >= 2 && this.stackElements[idx - 2].elementType === this.EXTERNAL_CHANGE) {
          ex.changeset =
            Changeset.compose(this.stackElements[idx - 2].changeset, ex.changeset, pool);
          this.stackElements.splice(idx - 2, 1);
          idx--;
        }
      } else {
        idx--;
      }
    }
  }

  getNthFromTop = (n: number) => {
    // precond: 0 <= n < numEvents()
    this.exposeEvent(n);
    return this.stackElements[this.stackElements.length - 1 - n];
  }
  numEvents = () => this.numUndoableEvents;
  popEvent = () => {
    // precond: numEvents() > 0
    this.exposeEvent(0);
    this.numUndoableEvents--;
    return this.stackElements.pop();
  }
}

class UndoModule {
  // invariant: stack always has at least one undoable event
  private undoPtr = 0
  private stack: Stack
  public enabled: boolean
  private readonly apool: AttributePool|null
  constructor() {
    this.stack = new Stack()
    this.enabled =  true
    this.apool =  null
  }

  clearHistory = () => {
    this.stack.clearStack();
    this.undoPtr = 0;
  }

  private charOccurrences = (str: string, c: string) => {
    let i = 0;
    let count = 0;
    while (i >= 0 && i < str.length) {
      i = str.indexOf(c, i);
      if (i >= 0) {
        count++;
        i++;
      }
    }
    return count;
  }
  private opcodeOccurrences = (cs: string, opcode: string) => this.charOccurrences(Changeset.unpack(cs).ops, opcode)
  private mergeChangesets = (cs1: string, cs2:string) => {
    if (!cs1) return cs2;
    if (!cs2) return cs1;

    // Rough heuristic for whether changesets should be considered one action:
    // each does exactly one insertion, no dels, and the composition does also; or
    // each does exactly one deletion, no ins, and the composition does also.
    // A little weird in that it won't merge "make bold" with "insert char"
    // but will merge "make bold and insert char" with "insert char",
    // though that isn't expected to come up.
    const plusCount1 = this.opcodeOccurrences(cs1, '+');
    const plusCount2 = this.opcodeOccurrences(cs2, '+');
    const minusCount1 = this.opcodeOccurrences(cs1, '-');
    const minusCount2 = this.opcodeOccurrences(cs2, '-');
    if (plusCount1 === 1 && plusCount2 === 1 && minusCount1 === 0 && minusCount2 === 0) {
      const merge = Changeset.compose(cs1, cs2, this.getAPool());
      const plusCount3 = this.opcodeOccurrences(merge, '+');
      const minusCount3 = this.opcodeOccurrences(merge, '-');
      if (plusCount3 === 1 && minusCount3 === 0) {
        return merge;
      }
    } else if (plusCount1 === 0 && plusCount2 === 0 && minusCount1 === 1 && minusCount2 === 1) {
      const merge = Changeset.compose(cs1, cs2, this.getAPool());
      const plusCount3 = this.opcodeOccurrences(merge, '+');
      const minusCount3 = this.opcodeOccurrences(merge, '-');
      if (plusCount3 === 0 && minusCount3 === 1) {
        return merge;
      }
    }
    return null;
  }

  reportEvent = (event: any) => {
    const topEvent = this.stack.getNthFromTop(0);

    const applySelectionToTop = () => {
      if ((typeof event.selStart) === 'number') {
        topEvent.selStart = event.selStart;
        topEvent.selEnd = event.selEnd;
        topEvent.selFocusAtStart = event.selFocusAtStart;
      }
    };

    if ((!event.backset) || Changeset.isIdentity(event.backset)) {
      applySelectionToTop();
    } else {
      let merged = false;
      if (topEvent.eventType === event.eventType) {
        const merge = this.mergeChangesets(event.backset, topEvent.backset);
        if (merge) {
          topEvent.backset = merge;
          applySelectionToTop();
          merged = true;
        }
      }
      if (!merged) {
        /*
         * Push the event on the undo stack only if it exists, and if it's
         * not a "clearauthorship". This disallows undoing the removal of the
         * authorship colors, but is a necessary stopgap measure against
         * https://github.com/ether/etherpad-lite/issues/2802
         */
        if (event && (event.eventType !== 'clearauthorship')) {
          this.stack.pushEvent(event);
        }
      }
      this.undoPtr = 0;
    }
  }
  reportExternalChange = (changeset: string) => {
    if (changeset && !Changeset.isIdentity(changeset)) {
      this.stack.pushExternalChange(changeset);
    }
  }
  getSelectionInfo = (event: any) => {
    if ((typeof event.selStart) !== 'number') {
      return null;
    } else {
      return {
        selStart: event.selStart,
        selEnd: event.selEnd,
        selFocusAtStart: event.selFocusAtStart,
      };
    }
  }
  // For "undo" and "redo", the change event must be returned
  // by eventFunc and NOT reported through the normal mechanism.
  // "eventFunc" should take a changeset and an optional selection info object,
  // or can be called with no arguments to mean that no undo is possible.
  // "eventFunc" will be called exactly once.

  performUndo = (eventFunc: Function) => {
    if (this.undoPtr < this.stack.numEvents() - 1) {
      const backsetEvent = this.stack.getNthFromTop(this.undoPtr);
      const selectionEvent = this.stack.getNthFromTop(this.undoPtr + 1);
      const undoEvent = eventFunc(backsetEvent.backset, this.getSelectionInfo(selectionEvent));
      this.stack.pushEvent(undoEvent);
      this.undoPtr += 2;
    } else { eventFunc(); }
  }
  performRedo = (eventFunc: Function) => {
    if (this.undoPtr >= 2) {
      const backsetEvent = this.stack.getNthFromTop(0);
      const selectionEvent = this.stack.getNthFromTop(1);
      eventFunc(backsetEvent.backset, this.getSelectionInfo(selectionEvent));
      this.stack.popEvent();
      this.undoPtr -= 2;
    } else { eventFunc(); }
  }
  getAPool = () => this.apool;

}

export const undoModule = new UndoModule()

