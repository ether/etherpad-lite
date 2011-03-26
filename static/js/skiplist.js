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





function newSkipList() {
  var PROFILER = window.PROFILER;
  if (!PROFILER) {
    PROFILER = function() { return {start:noop, mark:noop, literal:noop, end:noop, cancel:noop}; };
  }
  function noop() {}

  // if there are N elements in the skiplist, "start" is element -1 and "end" is element N
  var start = {key:null, levels: 1, upPtrs:[null], downPtrs:[null], downSkips:[1], downSkipWidths:[0]};
  var end = {key:null, levels: 1, upPtrs:[null], downPtrs:[null], downSkips:[null], downSkipWidths:[null]};
  var numNodes = 0;
  var totalWidth = 0;
  var keyToNodeMap = {};
  start.downPtrs[0] = end;
  end.upPtrs[0] = start;
  // a "point" object at location x allows modifications immediately after the first
  // x elements of the skiplist, such as multiple inserts or deletes.
  // After an insert or delete using point P, the point is still valid and points
  // to the same index in the skiplist.  Other operations with other points invalidate
  // this point.
  function _getPoint(targetLoc) {
    var numLevels = start.levels;
    var lvl = numLevels-1;
    var i = -1, ws = 0;
    var nodes = new Array(numLevels);
    var idxs = new Array(numLevels);
    var widthSkips = new Array(numLevels);
    nodes[lvl] = start;
    idxs[lvl] = -1;
    widthSkips[lvl] = 0;
    while (lvl >= 0) {
      var n = nodes[lvl];
      while (n.downPtrs[lvl] &&
	     (i + n.downSkips[lvl] < targetLoc)) {
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
    return {nodes:nodes, idxs:idxs, loc:targetLoc, widthSkips:widthSkips, toString: function() {
      return "getPoint("+targetLoc+")"; } };
  }
  function _getNodeAtOffset(targetOffset) {
    var i = 0;
    var n = start;
    var lvl = start.levels-1;
    while (lvl >= 0 && n.downPtrs[lvl]) {
      while (n.downPtrs[lvl] && (i + n.downSkipWidths[lvl] <= targetOffset)) {
	i += n.downSkipWidths[lvl];
	n = n.downPtrs[lvl];
      }
      lvl--;
    }
    if (n === start) return (start.downPtrs[0] || null);
    else if (n === end) return (targetOffset == totalWidth ? (end.upPtrs[0] || null) : null);
    return n;
  }
  function _entryWidth(e) { return (e && e.width) || 0; }
  function _insertKeyAtPoint(point, newKey, entry) {
    var p = PROFILER("insertKey", false);
    var newNode = {key:newKey, levels: 0, upPtrs:[], downPtrs:[], downSkips:[], downSkipWidths:[]};
    p.mark("donealloc");
    var pNodes = point.nodes;
    var pIdxs = point.idxs;
    var pLoc = point.loc;
    var widthLoc = point.widthSkips[0] + point.nodes[0].downSkipWidths[0];
    var newWidth = _entryWidth(entry);
    p.mark("loop1");
    while (newNode.levels == 0 || Math.random() < 0.01) {
      var lvl = newNode.levels;
      newNode.levels++;
      if (lvl == pNodes.length) {
	// assume we have just passed the end of point.nodes, and reached one level greater
	// than the skiplist currently supports
	pNodes[lvl] = start;
	pIdxs[lvl] = -1;
	start.levels++;
	end.levels++;
	start.downPtrs[lvl] = end;
	end.upPtrs[lvl] = start;
	start.downSkips[lvl] = numNodes+1;
	start.downSkipWidths[lvl] = totalWidth;
	point.widthSkips[lvl] = 0;
      }
      var me = newNode;
      var up = pNodes[lvl];
      var down = up.downPtrs[lvl];
      var skip1 = pLoc - pIdxs[lvl];
      var skip2 = up.downSkips[lvl] + 1 - skip1;
      up.downSkips[lvl] = skip1;
      up.downPtrs[lvl] = me;
      me.downSkips[lvl] = skip2;
      me.upPtrs[lvl] = up;
      me.downPtrs[lvl] = down;
      down.upPtrs[lvl] = me;
      var widthSkip1 = widthLoc - point.widthSkips[lvl];
      var widthSkip2 = up.downSkipWidths[lvl] + newWidth - widthSkip1;
      up.downSkipWidths[lvl] = widthSkip1;
      me.downSkipWidths[lvl] = widthSkip2;
    }
    p.mark("loop2");
    p.literal(pNodes.length, "PNL");
    for(var lvl=newNode.levels; lvl<pNodes.length; lvl++) {
      var up = pNodes[lvl];
      up.downSkips[lvl]++;
      up.downSkipWidths[lvl] += newWidth;
    }
    p.mark("map");
    keyToNodeMap['$KEY$'+newKey] = newNode;
    numNodes++;
    totalWidth += newWidth;
    p.end();
  }
  function _getNodeAtPoint(point) {
    return point.nodes[0].downPtrs[0];
  }
  function _incrementPoint(point) {
    point.loc++;
    for(var i=0;i<point.nodes.length;i++) {
      if (point.idxs[i] + point.nodes[i].downSkips[i] < point.loc) {
	point.idxs[i] += point.nodes[i].downSkips[i];
	point.widthSkips[i] += point.nodes[i].downSkipWidths[i];
	point.nodes[i] = point.nodes[i].downPtrs[i];
      }
    }
  }
  function _deleteKeyAtPoint(point) {
    var elem = point.nodes[0].downPtrs[0];
    var elemWidth = _entryWidth(elem.entry);
    for(var i=0;i<point.nodes.length;i++) {
      if (i < elem.levels) {
	var up = elem.upPtrs[i];
	var down = elem.downPtrs[i];
	var totalSkip = up.downSkips[i] + elem.downSkips[i] - 1;
	up.downPtrs[i] = down;
	down.upPtrs[i] = up;
	up.downSkips[i] = totalSkip;
	var totalWidthSkip = up.downSkipWidths[i] + elem.downSkipWidths[i] - elemWidth;
	up.downSkipWidths[i] = totalWidthSkip;
      }
      else {
	var up = point.nodes[i];
	var down = up.downPtrs[i];
	up.downSkips[i]--;
	up.downSkipWidths[i] -= elemWidth;
      }
    }
    delete keyToNodeMap['$KEY$'+elem.key];
    numNodes--;
    totalWidth -= elemWidth;
  }
  function _propagateWidthChange(node) {
    var oldWidth = node.downSkipWidths[0];
    var newWidth = _entryWidth(node.entry);
    var widthChange = newWidth - oldWidth;
    var n = node;
    var lvl = 0;
    while (lvl < n.levels) {
      n.downSkipWidths[lvl] += widthChange;
      lvl++;
      while (lvl >= n.levels && n.upPtrs[lvl-1]) {
	n = n.upPtrs[lvl-1];
      }
    }
    totalWidth += widthChange;
  }
  function _getNodeIndex(node, byWidth) {
    var dist = (byWidth ? 0 : -1);
    var n = node;
    while (n !== start) {
      var lvl = n.levels-1;
      n = n.upPtrs[lvl];
      if (byWidth) dist += n.downSkipWidths[lvl];
      else dist += n.downSkips[lvl];
    }
    return dist;
  }
  /*function _debugToString() {
    var array = [start];
    while (array[array.length-1] !== end) {
      array[array.length] = array[array.length-1].downPtrs[0];
    }
    function getIndex(node) {
      if (!node) return null;
      for(var i=0;i<array.length;i++) {
	if (array[i] === node)
	  return i-1;
      }
      return false;
    }
    var processedArray = map(array, function(node) {
      var x = {key:node.key, levels: node.levels, downSkips: node.downSkips,
	upPtrs: map(node.upPtrs, getIndex), downPtrs: map(node.downPtrs, getIndex),
	downSkipWidths: node.downSkipWidths};
      return x;
    });
    return map(processedArray, function (x) { return x.toSource(); }).join("\n");
  }*/

  function _getNodeByKey(key) {
    return keyToNodeMap['$KEY$'+key];
  }

  // Returns index of first entry such that entryFunc(entry) is truthy,
  // or length() if no such entry.  Assumes all falsy entries come before
  // all truthy entries.
  function _search(entryFunc) {
    var low = start;
    var lvl = start.levels-1;
    var lowIndex = -1;
    function f(node) {
      if (node === start) return false;
      else if (node === end) return true;
      else return entryFunc(node.entry);
    }
    while (lvl >= 0) {
      var nextLow = low.downPtrs[lvl];
      while (!f(nextLow)) {
	lowIndex += low.downSkips[lvl];
	low = nextLow;
	nextLow = low.downPtrs[lvl];
      }
      lvl--;
    }
    return lowIndex+1;
  }

/*
The skip-list contains "entries", JavaScript objects that each must have a unique "key" property
that is a string.
*/
  var self = {
    length: function() { return numNodes; },
    atIndex: function(i) {
      if (i < 0) console.warn("atIndex("+i+")");
      if (i >= numNodes) console.warn("atIndex("+i+">="+numNodes+")");
      return _getNodeAtPoint(_getPoint(i)).entry;
    },
    // differs from Array.splice() in that new elements are in an array, not varargs
    splice: function(start, deleteCount, newEntryArray) {
      if (start < 0) console.warn("splice("+start+", ...)");
      if (start + deleteCount > numNodes) {
	console.warn("splice("+start+", "+deleteCount+", ...), N="+numNodes);
	console.warn("%s %s %s", typeof start, typeof deleteCount, typeof numNodes);
	console.trace();
      }

      if (! newEntryArray) newEntryArray = [];
      var pt = _getPoint(start);
      for(var i=0;i<deleteCount;i++) {
	_deleteKeyAtPoint(pt);
      }
      for(var i=(newEntryArray.length-1);i>=0;i--) {
	var entry = newEntryArray[i];
	_insertKeyAtPoint(pt, entry.key, entry);
	var node = _getNodeByKey(entry.key);
	node.entry = entry;
      }
    },
    next: function (entry) {
      return _getNodeByKey(entry.key).downPtrs[0].entry || null;
    },
    prev: function (entry) {
      return _getNodeByKey(entry.key).upPtrs[0].entry || null;
    },
    push: function(entry) {
      self.splice(numNodes, 0, [entry]);
    },
    slice: function(start, end) {
      // act like Array.slice()
      if (start === undefined) start = 0;
      else if (start < 0) start += numNodes;
      if (end === undefined) end = numNodes;
      else if (end < 0) end += numNodes;

      if (start < 0) start = 0;
      if (start > numNodes) start = numNodes;
      if (end < 0) end = 0;
      if (end > numNodes) end = numNodes;

      dmesg(String([start,end,numNodes]));
      if (end <= start) return [];
      var n = self.atIndex(start);
      var array = [n];
      for(var i=1;i<(end-start);i++) {
	n = self.next(n);
	array.push(n);
      }
      return array;
    },
    atKey: function(key) { return _getNodeByKey(key).entry; },
    indexOfKey: function(key) { return _getNodeIndex(_getNodeByKey(key)); },
    indexOfEntry: function (entry) { return self.indexOfKey(entry.key); },
    containsKey: function(key) { return !!(_getNodeByKey(key)); },
    // gets the last entry starting at or before the offset
    atOffset: function(offset) { return _getNodeAtOffset(offset).entry; },
    keyAtOffset: function(offset) { return self.atOffset(offset).key; },
    offsetOfKey: function(key) { return _getNodeIndex(_getNodeByKey(key), true); },
    offsetOfEntry: function(entry) { return self.offsetOfKey(entry.key); },
    setEntryWidth: function(entry, width) { entry.width = width; _propagateWidthChange(_getNodeByKey(entry.key)); },
    totalWidth: function() { return totalWidth; },
    offsetOfIndex: function(i) {
      if (i < 0) return 0;
      if (i >= numNodes) return totalWidth;
      return self.offsetOfEntry(self.atIndex(i));
    },
    indexOfOffset: function(offset) {
      if (offset <= 0) return 0;
      if (offset >= totalWidth) return numNodes;
      return self.indexOfEntry(self.atOffset(offset));
    },
    search: function(entryFunc) {
      return _search(entryFunc);
    },
    //debugToString: _debugToString,
    debugGetPoint: _getPoint,
    debugDepth: function() { return start.levels; }
  }
  return self;
}
