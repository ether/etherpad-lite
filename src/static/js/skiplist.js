'use strict';

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

const Ace2Common = require('./ace2_common');
const _ = require('./underscore');

const noop = Ace2Common.noop;

function SkipList() {
  let PROFILER = window.PROFILER;
  if (!PROFILER) {
    PROFILER = () => ({
      start: noop,
      mark: noop,
      literal: noop,
      end: noop,
      cancel: noop,
    });
  }

  // if there are N elements in the skiplist, "start" is element -1 and "end" is element N
  const start = {
    key: null,
    levels: 1,
    upPtrs: [null],
    downPtrs: [null],
    downSkips: [1],
    downSkipWidths: [0],
  };
  const end = {
    key: null,
    levels: 1,
    upPtrs: [null],
    downPtrs: [null],
    downSkips: [null],
    downSkipWidths: [null],
  };
  let numNodes = 0;
  let totalWidth = 0;
  const keyToNodeMap = {};
  start.downPtrs[0] = end;
  end.upPtrs[0] = start;
  // a "point" object at location x allows modifications immediately after the first
  // x elements of the skiplist, such as multiple inserts or deletes.
  // After an insert or delete using point P, the point is still valid and points
  // to the same index in the skiplist.  Other operations with other points invalidate
  // this point.


  const _getPoint = (targetLoc) => {
    const numLevels = start.levels;
    let lvl = numLevels - 1;
    let i = -1;
    let ws = 0;
    const nodes = new Array(numLevels);
    const idxs = new Array(numLevels);
    const widthSkips = new Array(numLevels);
    nodes[lvl] = start;
    idxs[lvl] = -1;
    widthSkips[lvl] = 0;
    while (lvl >= 0) {
      let n = nodes[lvl];
      while (n.downPtrs[lvl] && (i + n.downSkips[lvl] < targetLoc)) {
        i += n.downSkips[lvl];
        ws += n.downSkipWidths[lvl];
        n = n.downPtrs[lvl];
      }
      nodes[lvl] = n;
      idxs[lvl] = i;
      widthSkips[lvl] = ws;
      lvl--;
      if (lvl >= 0) {
        nodes[lvl] = n;
      }
    }
    return {
      nodes,
      idxs,
      loc: targetLoc,
      widthSkips,
      toString: () => `getPoint(${targetLoc})`,
    };
  };

  const _getNodeAtOffset = (targetOffset) => {
    let i = 0;
    let n = start;
    let lvl = start.levels - 1;
    while (lvl >= 0 && n.downPtrs[lvl]) {
      while (n.downPtrs[lvl] && (i + n.downSkipWidths[lvl] <= targetOffset)) {
        i += n.downSkipWidths[lvl];
        n = n.downPtrs[lvl];
      }
      lvl--;
    }
    if (n === start) return (start.downPtrs[0] || null);
    else if (n === end) return (targetOffset === totalWidth ? (end.upPtrs[0] || null) : null);
    return n;
  };

  const _entryWidth = (e) => (e && e.width) || 0;

  const _insertKeyAtPoint = (point, newKey, entry) => {
    const p = PROFILER('insertKey', false); // eslint-disable-line new-cap
    const newNode = {
      key: newKey,
      levels: 0,
      upPtrs: [],
      downPtrs: [],
      downSkips: [],
      downSkipWidths: [],
    };
    p.mark('donealloc');
    const pNodes = point.nodes;
    const pIdxs = point.idxs;
    const pLoc = point.loc;
    const widthLoc = point.widthSkips[0] + point.nodes[0].downSkipWidths[0];
    const newWidth = _entryWidth(entry);
    p.mark('loop1');

    // The new node will have at least level 1
    // With a proability of 0.01^(n-1) the nodes level will be >= n
    while (newNode.levels === 0 || Math.random() < 0.01) {
      const lvl = newNode.levels;
      newNode.levels++;
      if (lvl === pNodes.length) {
        // assume we have just passed the end of point.nodes, and reached one level greater
        // than the skiplist currently supports
        pNodes[lvl] = start;
        pIdxs[lvl] = -1;
        start.levels++;
        end.levels++;
        start.downPtrs[lvl] = end;
        end.upPtrs[lvl] = start;
        start.downSkips[lvl] = numNodes + 1;
        start.downSkipWidths[lvl] = totalWidth;
        point.widthSkips[lvl] = 0;
      }
      const me = newNode;
      const up = pNodes[lvl];
      const down = up.downPtrs[lvl];
      const skip1 = pLoc - pIdxs[lvl];
      const skip2 = up.downSkips[lvl] + 1 - skip1;
      up.downSkips[lvl] = skip1;
      up.downPtrs[lvl] = me;
      me.downSkips[lvl] = skip2;
      me.upPtrs[lvl] = up;
      me.downPtrs[lvl] = down;
      down.upPtrs[lvl] = me;
      const widthSkip1 = widthLoc - point.widthSkips[lvl];
      const widthSkip2 = up.downSkipWidths[lvl] + newWidth - widthSkip1;
      up.downSkipWidths[lvl] = widthSkip1;
      me.downSkipWidths[lvl] = widthSkip2;
    }
    p.mark('loop2');
    p.literal(pNodes.length, 'PNL');
    for (let lvl = newNode.levels; lvl < pNodes.length; lvl++) {
      const up = pNodes[lvl];
      up.downSkips[lvl]++;
      up.downSkipWidths[lvl] += newWidth;
    }
    p.mark('map');
    keyToNodeMap[`$KEY$${newKey}`] = newNode;
    numNodes++;
    totalWidth += newWidth;
    p.end();
  };

  const _getNodeAtPoint = (point) => point.nodes[0].downPtrs[0];

  const _deleteKeyAtPoint = (point) => {
    const elem = point.nodes[0].downPtrs[0];
    const elemWidth = _entryWidth(elem.entry);
    for (let i = 0; i < point.nodes.length; i++) {
      if (i < elem.levels) {
        const up = elem.upPtrs[i];
        const down = elem.downPtrs[i];
        const totalSkip = up.downSkips[i] + elem.downSkips[i] - 1;
        up.downPtrs[i] = down;
        down.upPtrs[i] = up;
        up.downSkips[i] = totalSkip;
        const totalWidthSkip = up.downSkipWidths[i] + elem.downSkipWidths[i] - elemWidth;
        up.downSkipWidths[i] = totalWidthSkip;
      } else {
        const up = point.nodes[i];
        up.downSkips[i]--;
        up.downSkipWidths[i] -= elemWidth;
      }
    }
    delete keyToNodeMap[`$KEY$${elem.key}`];
    numNodes--;
    totalWidth -= elemWidth;
  };

  const _propagateWidthChange = (node) => {
    const oldWidth = node.downSkipWidths[0];
    const newWidth = _entryWidth(node.entry);
    const widthChange = newWidth - oldWidth;
    let n = node;
    let lvl = 0;
    while (lvl < n.levels) {
      n.downSkipWidths[lvl] += widthChange;
      lvl++;
      while (lvl >= n.levels && n.upPtrs[lvl - 1]) {
        n = n.upPtrs[lvl - 1];
      }
    }
    totalWidth += widthChange;
  };

  const _getNodeIndex = (node, byWidth) => {
    let dist = (byWidth ? 0 : -1);
    let n = node;
    while (n !== start) {
      const lvl = n.levels - 1;
      n = n.upPtrs[lvl];
      if (byWidth) dist += n.downSkipWidths[lvl];
      else dist += n.downSkips[lvl];
    }
    return dist;
  };

  const _getNodeByKey = (key) => keyToNodeMap[`$KEY$${key}`];

  // Returns index of first entry such that entryFunc(entry) is truthy,
  // or length() if no such entry.  Assumes all falsy entries come before
  // all truthy entries.


  const _search = (entryFunc) => {
    let low = start;
    let lvl = start.levels - 1;
    let lowIndex = -1;

    const f = (node) => {
      if (node === start) return false;
      else if (node === end) return true;
      else return entryFunc(node.entry);
    };

    while (lvl >= 0) {
      let nextLow = low.downPtrs[lvl];
      while (!f(nextLow)) {
        lowIndex += low.downSkips[lvl];
        low = nextLow;
        nextLow = low.downPtrs[lvl];
      }
      lvl--;
    }
    return lowIndex + 1;
  };

  /*
The skip-list contains "entries", JavaScript objects that each must have a unique "key" property
that is a string.
  */
  const self = this;
  _.extend(this, {
    length: () => numNodes,
    atIndex: (i) => {
      if (i < 0) console.warn(`atIndex(${i})`);
      if (i >= numNodes) console.warn(`atIndex(${i}>=${numNodes})`);
      return _getNodeAtPoint(_getPoint(i)).entry;
    },
    // differs from Array.splice() in that new elements are in an array, not varargs
    splice: (start, deleteCount, newEntryArray) => {
      if (start < 0) console.warn(`splice(${start}, ...)`);
      if (start + deleteCount > numNodes) {
        console.warn(`splice(${start}, ${deleteCount}, ...), N=${numNodes}`);
        console.warn('%s %s %s', typeof start, typeof deleteCount, typeof numNodes);
        console.trace();
      }

      if (!newEntryArray) newEntryArray = [];
      const pt = _getPoint(start);
      for (let i = 0; i < deleteCount; i++) {
        _deleteKeyAtPoint(pt);
      }
      for (let i = (newEntryArray.length - 1); i >= 0; i--) {
        const entry = newEntryArray[i];
        _insertKeyAtPoint(pt, entry.key, entry);
        const node = _getNodeByKey(entry.key);
        node.entry = entry;
      }
    },
    next: (entry) => _getNodeByKey(entry.key).downPtrs[0].entry || null,
    prev: (entry) => _getNodeByKey(entry.key).upPtrs[0].entry || null,
    push: (entry) => {
      self.splice(numNodes, 0, [entry]);
    },
    slice: (start, end) => {
      // act like Array.slice()
      if (start === undefined) start = 0;
      else if (start < 0) start += numNodes;
      if (end === undefined) end = numNodes;
      else if (end < 0) end += numNodes;

      if (start < 0) start = 0;
      if (start > numNodes) start = numNodes;
      if (end < 0) end = 0;
      if (end > numNodes) end = numNodes;

      window.dmesg(String([start, end, numNodes]));
      if (end <= start) return [];
      let n = self.atIndex(start);
      const array = [n];
      for (let i = 1; i < (end - start); i++) {
        n = self.next(n);
        array.push(n);
      }
      return array;
    },
    atKey: (key) => _getNodeByKey(key).entry,
    indexOfKey: (key) => _getNodeIndex(_getNodeByKey(key)),
    indexOfEntry: (entry) => self.indexOfKey(entry.key),
    containsKey: (key) => !!(_getNodeByKey(key)),
    // gets the last entry starting at or before the offset
    atOffset: (offset) => _getNodeAtOffset(offset).entry,
    keyAtOffset: (offset) => self.atOffset(offset).key,
    offsetOfKey: (key) => _getNodeIndex(_getNodeByKey(key), true),
    offsetOfEntry: (entry) => self.offsetOfKey(entry.key),
    setEntryWidth: (entry, width) => {
      entry.width = width;
      _propagateWidthChange(_getNodeByKey(entry.key));
    },
    totalWidth: () => totalWidth,
    offsetOfIndex: (i) => {
      if (i < 0) return 0;
      if (i >= numNodes) return totalWidth;
      return self.offsetOfEntry(self.atIndex(i));
    },
    indexOfOffset: (offset) => {
      if (offset <= 0) return 0;
      if (offset >= totalWidth) return numNodes;
      return self.indexOfEntry(self.atOffset(offset));
    },
    search: (entryFunc) => _search(entryFunc),
    // debugToString: _debugToString,
    debugGetPoint: _getPoint,
    debugDepth: () => start.levels,
  });
}

module.exports = SkipList;
