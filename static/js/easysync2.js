// THIS FILE IS ALSO AN APPJET MODULE: etherpad.collab.ace.easysync2
// %APPJET%: jimport("com.etherpad.Easysync2Support");

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

//var _opt = (this.Easysync2Support || null);
var _opt = null; // disable optimization for now

function AttribPool() {
  var p = {};
  p.numToAttrib = {}; // e.g. {0: ['foo','bar']}
  p.attribToNum = {}; // e.g. {'foo,bar': 0}
  p.nextNum = 0;

  p.putAttrib = function(attrib, dontAddIfAbsent) {
    var str = String(attrib);
    if (str in p.attribToNum) {
      return p.attribToNum[str];
    }
    if (dontAddIfAbsent) {
      return -1;
    }
    var num = p.nextNum++;
    p.attribToNum[str] = num;
    p.numToAttrib[num] = [String(attrib[0]||''),
			  String(attrib[1]||'')];
    return num;
  };

  p.getAttrib = function(num) {
    var pair = p.numToAttrib[num];
    if (! pair) return pair;
    return [pair[0], pair[1]]; // return a mutable copy
  };

  p.getAttribKey = function(num) {
    var pair = p.numToAttrib[num];
    if (! pair) return '';
    return pair[0];
  };

  p.getAttribValue = function(num) {
    var pair = p.numToAttrib[num];
    if (! pair) return '';
    return pair[1];
  };

  p.eachAttrib = function(func) {
    for(var n in p.numToAttrib) {
      var pair = p.numToAttrib[n];
      func(pair[0], pair[1]);
    }
  };

  p.toJsonable = function() {
    return {numToAttrib: p.numToAttrib, nextNum: p.nextNum};
  };

  p.fromJsonable = function(obj) {
    p.numToAttrib = obj.numToAttrib;
    p.nextNum = obj.nextNum;
    p.attribToNum = {};
    for(var n in p.numToAttrib) {
      p.attribToNum[String(p.numToAttrib[n])] = Number(n);
    }
    return p;
  };

  return p;
}

var Changeset = {};

Changeset.error = function error(msg) { var e = new Error(msg); e.easysync = true; throw e; };
Changeset.assert = function assert(b, msgParts) {
  if (! b) {
    var msg = Array.prototype.slice.call(arguments, 1).join('');
    Changeset.error("Changeset: "+msg);
  }
};

Changeset.parseNum = function(str) { return parseInt(str, 36); };
Changeset.numToString = function(num) { return num.toString(36).toLowerCase(); };
Changeset.toBaseTen = function(cs) {
  var dollarIndex = cs.indexOf('$');
  var beforeDollar = cs.substring(0, dollarIndex);
  var fromDollar = cs.substring(dollarIndex);
  return beforeDollar.replace(/[0-9a-z]+/g, function(s) {
    return String(Changeset.parseNum(s)); }) + fromDollar;
};

Changeset.oldLen = function(cs) {
  return Changeset.unpack(cs).oldLen;
};
Changeset.newLen = function(cs) {
  return Changeset.unpack(cs).newLen;
};

Changeset.opIterator = function(opsStr, optStartIndex) {
  //print(opsStr);
  var regex = /((?:\*[0-9a-z]+)*)(?:\|([0-9a-z]+))?([-+=])([0-9a-z]+)|\?|/g;
  var startIndex = (optStartIndex || 0);
  var curIndex = startIndex;
  var prevIndex = curIndex;
  function nextRegexMatch() {
    prevIndex = curIndex;
    var result;
    if (_opt) {
      result = _opt.nextOpInString(opsStr, curIndex);
      if (result) {
        if (result.opcode() == '?') {
          Changeset.error("Hit error opcode in op stream");
        }
        curIndex = result.lastIndex();
      }
    }
    else {
      regex.lastIndex = curIndex;
      result = regex.exec(opsStr);
      curIndex = regex.lastIndex;
      if (result[0] == '?') {
        Changeset.error("Hit error opcode in op stream");
      }
    }
    return result;
  }
  var regexResult = nextRegexMatch();
  var obj = Changeset.newOp();
  function next(optObj) {
    var op = (optObj || obj);
    if (_opt && regexResult) {
      op.attribs = regexResult.attribs();
      op.lines = regexResult.lines();
      op.chars = regexResult.chars();
      op.opcode = regexResult.opcode();
      regexResult = nextRegexMatch();
    }
    else if ((! _opt) && regexResult[0]) {
      op.attribs = regexResult[1];
      op.lines = Changeset.parseNum(regexResult[2] || 0);
      op.opcode = regexResult[3];
      op.chars = Changeset.parseNum(regexResult[4]);
      regexResult = nextRegexMatch();
    }
    else {
      Changeset.clearOp(op);
    }
    return op;
  }
  function hasNext() { return !! (_opt ? regexResult : regexResult[0]); }
  function lastIndex() { return prevIndex; }
  return {next: next, hasNext: hasNext, lastIndex: lastIndex};
};

Changeset.clearOp = function(op) {
  op.opcode = '';
  op.chars = 0;
  op.lines = 0;
  op.attribs = '';
};
Changeset.newOp = function(optOpcode) {
  return {opcode:(optOpcode || ''), chars:0, lines:0, attribs:''};
};
Changeset.cloneOp = function(op) {
  return {opcode: op.opcode, chars: op.chars, lines: op.lines, attribs: op.attribs};
};
Changeset.copyOp = function(op1, op2) {
  op2.opcode = op1.opcode;
  op2.chars = op1.chars;
  op2.lines = op1.lines;
  op2.attribs = op1.attribs;
};
Changeset.opString = function(op) {
  // just for debugging
  if (! op.opcode) return 'null';
  var assem = Changeset.opAssembler();
  assem.append(op);
  return assem.toString();
};
Changeset.stringOp = function(str) {
  // just for debugging
  return Changeset.opIterator(str).next();
};

Changeset.checkRep = function(cs) {
  // doesn't check things that require access to attrib pool (e.g. attribute order)
  // or original string (e.g. newline positions)
  var unpacked = Changeset.unpack(cs);
  var oldLen = unpacked.oldLen;
  var newLen = unpacked.newLen;
  var ops = unpacked.ops;
  var charBank = unpacked.charBank;

  var assem = Changeset.smartOpAssembler();
  var oldPos = 0;
  var calcNewLen = 0;
  var numInserted = 0;
  var iter = Changeset.opIterator(ops);
  while (iter.hasNext()) {
    var o = iter.next();
    switch (o.opcode) {
    case '=': oldPos += o.chars; calcNewLen += o.chars; break;
    case '-': oldPos += o.chars; Changeset.assert(oldPos < oldLen, oldPos," >= ",oldLen," in ",cs); break;
    case '+': {
      calcNewLen += o.chars; numInserted += o.chars;
      Changeset.assert(calcNewLen < newLen, calcNewLen," >= ",newLen," in ",cs);
      break;
    }
    }
    assem.append(o);
  }

  calcNewLen += oldLen - oldPos;
  charBank = charBank.substring(0, numInserted);
  while (charBank.length < numInserted) {
    charBank += "?";
  }

  assem.endDocument();
  var normalized = Changeset.pack(oldLen, calcNewLen, assem.toString(), charBank);
  Changeset.assert(normalized == cs, normalized,' != ',cs);

  return cs;
}

Changeset.smartOpAssembler = function() {
  // Like opAssembler but able to produce conforming changesets
  // from slightly looser input, at the cost of speed.
  // Specifically:
  // - merges consecutive operations that can be merged
  // - strips final "="
  // - ignores 0-length changes
  // - reorders consecutive + and - (which margingOpAssembler doesn't do)

  var minusAssem = Changeset.mergingOpAssembler();
  var plusAssem = Changeset.mergingOpAssembler();
  var keepAssem = Changeset.mergingOpAssembler();
  var assem = Changeset.stringAssembler();
  var lastOpcode = '';
  var lengthChange = 0;

  function flushKeeps() {
    assem.append(keepAssem.toString());
    keepAssem.clear();
  }

  function flushPlusMinus() {
    assem.append(minusAssem.toString());
    minusAssem.clear();
    assem.append(plusAssem.toString());
    plusAssem.clear();
  }

  function append(op) {
    if (! op.opcode) return;
    if (! op.chars) return;

    if (op.opcode == '-') {
      if (lastOpcode == '=') {
	flushKeeps();
      }
      minusAssem.append(op);
      lengthChange -= op.chars;
    }
    else if (op.opcode == '+') {
      if (lastOpcode == '=') {
	flushKeeps();
      }
      plusAssem.append(op);
      lengthChange += op.chars;
    }
    else if (op.opcode == '=') {
      if (lastOpcode != '=') {
	flushPlusMinus();
      }
      keepAssem.append(op);
    }
    lastOpcode = op.opcode;
  }

  function appendOpWithText(opcode, text, attribs, pool) {
    var op = Changeset.newOp(opcode);
    op.attribs = Changeset.makeAttribsString(opcode, attribs, pool);
    var lastNewlinePos = text.lastIndexOf('\n');
    if (lastNewlinePos < 0) {
      op.chars = text.length;
      op.lines = 0;
      append(op);
    }
    else {
      op.chars = lastNewlinePos+1;
      op.lines = text.match(/\n/g).length;
      append(op);
      op.chars = text.length - (lastNewlinePos+1);
      op.lines = 0;
      append(op);
    }
  }

  function toString() {
    flushPlusMinus();
    flushKeeps();
    return assem.toString();
  }

  function clear() {
    minusAssem.clear();
    plusAssem.clear();
    keepAssem.clear();
    assem.clear();
    lengthChange = 0;
  }

  function endDocument() {
    keepAssem.endDocument();
  }

  function getLengthChange() {
    return lengthChange;
  }

  return {append: append, toString: toString, clear: clear, endDocument: endDocument,
	  appendOpWithText: appendOpWithText, getLengthChange: getLengthChange };
};

if (_opt) {
  Changeset.mergingOpAssembler = function() {
    var assem = _opt.mergingOpAssembler();

    function append(op) {
      assem.append(op.opcode, op.chars, op.lines, op.attribs);
    }
    function toString() {
      return assem.toString();
    }
    function clear() {
      assem.clear();
    }
    function endDocument() {
      assem.endDocument();
    }

    return {append: append, toString: toString, clear: clear, endDocument: endDocument};
  };
}
else {
  Changeset.mergingOpAssembler = function() {
    // This assembler can be used in production; it efficiently
    // merges consecutive operations that are mergeable, ignores
    // no-ops, and drops final pure "keeps".  It does not re-order
    // operations.
    var assem = Changeset.opAssembler();
    var bufOp = Changeset.newOp();

    // If we get, for example, insertions [xxx\n,yyy], those don't merge,
    // but if we get [xxx\n,yyy,zzz\n], that merges to [xxx\nyyyzzz\n].
    // This variable stores the length of yyy and any other newline-less
    // ops immediately after it.
    var bufOpAdditionalCharsAfterNewline = 0;

    function flush(isEndDocument) {
      if (bufOp.opcode) {
        if (isEndDocument && bufOp.opcode == '=' && ! bufOp.attribs) {
          // final merged keep, leave it implicit
        }
        else {
          assem.append(bufOp);
          if (bufOpAdditionalCharsAfterNewline) {
            bufOp.chars = bufOpAdditionalCharsAfterNewline;
            bufOp.lines = 0;
            assem.append(bufOp);
            bufOpAdditionalCharsAfterNewline = 0;
          }
        }
        bufOp.opcode = '';
      }
    }
    function append(op) {
      if (op.chars > 0) {
        if (bufOp.opcode == op.opcode && bufOp.attribs == op.attribs) {
          if (op.lines > 0) {
            // bufOp and additional chars are all mergeable into a multi-line op
            bufOp.chars += bufOpAdditionalCharsAfterNewline + op.chars;
            bufOp.lines += op.lines;
            bufOpAdditionalCharsAfterNewline = 0;
          }
          else if (bufOp.lines == 0) {
            // both bufOp and op are in-line
            bufOp.chars += op.chars;
          }
          else {
            // append in-line text to multi-line bufOp
            bufOpAdditionalCharsAfterNewline += op.chars;
          }
        }
        else {
          flush();
          Changeset.copyOp(op, bufOp);
        }
      }
    }
    function endDocument() {
      flush(true);
    }
    function toString() {
      flush();
      return assem.toString();
    }
    function clear() {
      assem.clear();
      Changeset.clearOp(bufOp);
    }
    return {append: append, toString: toString, clear: clear, endDocument: endDocument};
  };
}

if (_opt) {
  Changeset.opAssembler = function() {
    var assem = _opt.opAssembler();
    // this function allows op to be mutated later (doesn't keep a ref)
    function append(op) {
      assem.append(op.opcode, op.chars, op.lines, op.attribs);
    }
    function toString() {
      return assem.toString();
    }
    function clear() {
      assem.clear();
    }
    return {append: append, toString: toString, clear: clear};
  };
}
else {
  Changeset.opAssembler = function() {
    var pieces = [];
    // this function allows op to be mutated later (doesn't keep a ref)
    function append(op) {
      pieces.push(op.attribs);
      if (op.lines) {
        pieces.push('|', Changeset.numToString(op.lines));
      }
      pieces.push(op.opcode);
      pieces.push(Changeset.numToString(op.chars));
    }
    function toString() {
      return pieces.join('');
    }
    function clear() {
      pieces.length = 0;
    }
    return {append: append, toString: toString, clear: clear};
  };
}

Changeset.stringIterator = function(str) {
  var curIndex = 0;
  function assertRemaining(n) {
    Changeset.assert(n <= remaining(), "!(",n," <= ",remaining(),")");
  }
  function take(n) {
    assertRemaining(n);
    var s = str.substr(curIndex, n);
    curIndex += n;
    return s;
  }
  function peek(n) {
    assertRemaining(n);
    var s = str.substr(curIndex, n);
    return s;
  }
  function skip(n) {
    assertRemaining(n);
    curIndex += n;
  }
  function remaining() {
    return str.length - curIndex;
  }
  return {take:take, skip:skip, remaining:remaining, peek:peek};
};

Changeset.stringAssembler = function() {
  var pieces = [];
  function append(x) {
    pieces.push(String(x));
  }
  function toString() {
    return pieces.join('');
  }
  return {append: append, toString: toString};
};

// "lines" need not be an array as long as it supports certain calls (lines_foo inside).
Changeset.textLinesMutator = function(lines) {
  // Mutates lines, an array of strings, in place.
  // Mutation operations have the same constraints as changeset operations
  // with respect to newlines, but not the other additional constraints
  // (i.e. ins/del ordering, forbidden no-ops, non-mergeability, final newline).
  // Can be used to mutate lists of strings where the last char of each string
  // is not actually a newline, but for the purposes of N and L values,
  // the caller should pretend it is, and for things to work right in that case, the input
  // to insert() should be a single line with no newlines.

  var curSplice = [0,0];
  var inSplice = false;
  // position in document after curSplice is applied:
  var curLine = 0, curCol = 0;
  // invariant: if (inSplice) then (curLine is in curSplice[0] + curSplice.length - {2,3}) &&
  //            curLine >= curSplice[0]
  // invariant: if (inSplice && (curLine >= curSplice[0] + curSplice.length - 2)) then
  //            curCol == 0

  function lines_applySplice(s) {
    lines.splice.apply(lines, s);
  }
  function lines_toSource() {
    return lines.toSource();
  }
  function lines_get(idx) {
    if (lines.get) {
      return lines.get(idx);
    }
    else {
      return lines[idx];
    }
  }
  // can be unimplemented if removeLines's return value not needed
  function lines_slice(start, end) {
    if (lines.slice) {
      return lines.slice(start, end);
    }
    else {
      return [];
    }
  }
  function lines_length() {
    if ((typeof lines.length) == "number") {
      return lines.length;
    }
    else {
      return lines.length();
    }
  }

  function enterSplice() {
    curSplice[0] = curLine;
    curSplice[1] = 0;
    if (curCol > 0) {
      putCurLineInSplice();
    }
    inSplice = true;
  }
  function leaveSplice() {
    lines_applySplice(curSplice);
    curSplice.length = 2;
    curSplice[0] = curSplice[1] = 0;
    inSplice = false;
  }
  function isCurLineInSplice() {
    return (curLine - curSplice[0] < (curSplice.length - 2));
  }
  function debugPrint(typ) {
    print(typ+": "+curSplice.toSource()+" / "+curLine+","+curCol+" / "+lines_toSource());
  }
  function putCurLineInSplice() {
    if (! isCurLineInSplice()) {
      curSplice.push(lines_get(curSplice[0] + curSplice[1]));
      curSplice[1]++;
    }
    return 2 + curLine - curSplice[0];
  }

  function skipLines(L, includeInSplice) {
    if (L) {
      if (includeInSplice) {
	if (! inSplice) {
	  enterSplice();
	}
	for(var i=0;i<L;i++) {
	  curCol = 0;
	  putCurLineInSplice();
	  curLine++;
	}
      }
      else {
	if (inSplice) {
	  if (L > 1) {
	    leaveSplice();
	  }
	  else {
	    putCurLineInSplice();
	  }
	}
	curLine += L;
	curCol = 0;
      }
      //print(inSplice+" / "+isCurLineInSplice()+" / "+curSplice[0]+" / "+curSplice[1]+" / "+lines.length);
      /*if (inSplice && (! isCurLineInSplice()) && (curSplice[0] + curSplice[1] < lines.length)) {
	  print("BLAH");
	  putCurLineInSplice();
	}*/ // tests case foo in remove(), which isn't otherwise covered in current impl
    }
    //debugPrint("skip");
  }

  function skip(N, L, includeInSplice) {
    if (N) {
      if (L) {
	skipLines(L, includeInSplice);
      }
      else {
	if (includeInSplice && ! inSplice) {
	  enterSplice();
	}
	if (inSplice) {
	  putCurLineInSplice();
	}
	curCol += N;
	//debugPrint("skip");
      }
    }
  }

  function removeLines(L) {
    var removed = '';
    if (L) {
      if (! inSplice) {
	enterSplice();
      }
      function nextKLinesText(k) {
	var m = curSplice[0] + curSplice[1];
	return lines_slice(m, m+k).join('');
      }
      if (isCurLineInSplice()) {
	//print(curCol);
	if (curCol == 0) {
	  removed = curSplice[curSplice.length-1];
	  // print("FOO"); // case foo
	  curSplice.length--;
	  removed += nextKLinesText(L-1);
	  curSplice[1] += L-1;
	}
	else {
	  removed = nextKLinesText(L-1);
	  curSplice[1] += L-1;
	  var sline = curSplice.length - 1;
	  removed = curSplice[sline].substring(curCol) + removed;
	  curSplice[sline] = curSplice[sline].substring(0, curCol) +
	    lines_get(curSplice[0] + curSplice[1]);
	  curSplice[1] += 1;
	}
      }
      else {
	removed = nextKLinesText(L);
	curSplice[1] += L;
      }
      //debugPrint("remove");
    }
    return removed;
  }

  function remove(N, L) {
    var removed = '';
    if (N) {
      if (L) {
	return removeLines(L);
      }
      else {
	if (! inSplice) {
	  enterSplice();
	}
	var sline = putCurLineInSplice();
	removed = curSplice[sline].substring(curCol, curCol+N);
	curSplice[sline] = curSplice[sline].substring(0, curCol) +
	  curSplice[sline].substring(curCol+N);
	//debugPrint("remove");
      }
    }
    return removed;
  }

  function insert(text, L) {
    if (text) {
      if (! inSplice) {
	enterSplice();
      }
      if (L) {
	var newLines = Changeset.splitTextLines(text);
	if (isCurLineInSplice()) {
	  //if (curCol == 0) {
	  //curSplice.length--;
	  //curSplice[1]--;
	  //Array.prototype.push.apply(curSplice, newLines);
	  //curLine += newLines.length;
	  //}
	  //else {
	  var sline = curSplice.length - 1;
	  var theLine = curSplice[sline];
	  var lineCol = curCol;
	  curSplice[sline] = theLine.substring(0, lineCol) + newLines[0];
	  curLine++;
	  newLines.splice(0, 1);
	  Array.prototype.push.apply(curSplice, newLines);
	  curLine += newLines.length;
	  curSplice.push(theLine.substring(lineCol));
	  curCol = 0;
	  //}
	}
	else {
	  Array.prototype.push.apply(curSplice, newLines);
	  curLine += newLines.length;
	}
      }
      else {
	var sline = putCurLineInSplice();
	curSplice[sline] = curSplice[sline].substring(0, curCol) +
	  text + curSplice[sline].substring(curCol);
	curCol += text.length;
      }
      //debugPrint("insert");
    }
  }

  function hasMore() {
    //print(lines.length+" / "+inSplice+" / "+(curSplice.length - 2)+" / "+curSplice[1]);
    var docLines = lines_length();
    if (inSplice) {
      docLines += curSplice.length - 2 - curSplice[1];
    }
    return curLine < docLines;
  }

  function close() {
    if (inSplice) {
      leaveSplice();
    }
    //debugPrint("close");
  }

  var self = {skip:skip, remove:remove, insert:insert, close:close, hasMore:hasMore,
    removeLines:removeLines, skipLines: skipLines};
  return self;
};

Changeset.applyZip = function(in1, idx1, in2, idx2, func) {
  var iter1 = Changeset.opIterator(in1, idx1);
  var iter2 = Changeset.opIterator(in2, idx2);
  var assem = Changeset.smartOpAssembler();
  var op1 = Changeset.newOp();
  var op2 = Changeset.newOp();
  var opOut = Changeset.newOp();
  while (op1.opcode || iter1.hasNext() || op2.opcode || iter2.hasNext()) {
    if ((! op1.opcode) && iter1.hasNext()) iter1.next(op1);
    if ((! op2.opcode) && iter2.hasNext()) iter2.next(op2);
    func(op1, op2, opOut);
    if (opOut.opcode) {
      //print(opOut.toSource());
      assem.append(opOut);
      opOut.opcode = '';
    }
  }
  assem.endDocument();
  return assem.toString();
};

Changeset.unpack = function(cs) {
  var headerRegex = /Z:([0-9a-z]+)([><])([0-9a-z]+)|/;
  var headerMatch = headerRegex.exec(cs);
  if ((! headerMatch) || (! headerMatch[0])) {
    Changeset.error("Not a changeset: "+cs);
  }
  var oldLen = Changeset.parseNum(headerMatch[1]);
  var changeSign = (headerMatch[2] == '>') ? 1 : -1;
  var changeMag = Changeset.parseNum(headerMatch[3]);
  var newLen = oldLen + changeSign*changeMag;
  var opsStart = headerMatch[0].length;
  var opsEnd = cs.indexOf("$");
  if (opsEnd < 0) opsEnd = cs.length;
  return {oldLen: oldLen, newLen: newLen, ops: cs.substring(opsStart, opsEnd),
	  charBank: cs.substring(opsEnd+1)};
};

Changeset.pack = function(oldLen, newLen, opsStr, bank) {
  var lenDiff = newLen - oldLen;
  var lenDiffStr = (lenDiff >= 0 ?
		    '>'+Changeset.numToString(lenDiff) :
		    '<'+Changeset.numToString(-lenDiff));
  var a = [];
  a.push('Z:', Changeset.numToString(oldLen), lenDiffStr, opsStr, '$', bank);
  return a.join('');
};

Changeset.applyToText = function(cs, str) {
  var unpacked = Changeset.unpack(cs);
  Changeset.assert(str.length == unpacked.oldLen,
		   "mismatched apply: ",str.length," / ",unpacked.oldLen);
  var csIter = Changeset.opIterator(unpacked.ops);
  var bankIter = Changeset.stringIterator(unpacked.charBank);
  var strIter = Changeset.stringIterator(str);
  var assem = Changeset.stringAssembler();
  while (csIter.hasNext()) {
    var op = csIter.next();
    switch(op.opcode) {
    case '+': assem.append(bankIter.take(op.chars)); break;
    case '-': strIter.skip(op.chars); break;
    case '=': assem.append(strIter.take(op.chars)); break;
    }
  }
  assem.append(strIter.take(strIter.remaining()));
  return assem.toString();
};

Changeset.mutateTextLines = function(cs, lines) {
  var unpacked = Changeset.unpack(cs);
  var csIter = Changeset.opIterator(unpacked.ops);
  var bankIter = Changeset.stringIterator(unpacked.charBank);
  var mut = Changeset.textLinesMutator(lines);
  while (csIter.hasNext()) {
    var op = csIter.next();
    switch(op.opcode) {
    case '+': mut.insert(bankIter.take(op.chars), op.lines); break;
    case '-': mut.remove(op.chars, op.lines); break;
    case '=': mut.skip(op.chars, op.lines, (!! op.attribs)); break;
    }
  }
  mut.close();
};

Changeset.composeAttributes = function(att1, att2, resultIsMutation, pool) {
  // att1 and att2 are strings like "*3*f*1c", asMutation is a boolean.

  // Sometimes attribute (key,value) pairs are treated as attribute presence
  // information, while other times they are treated as operations that
  // mutate a set of attributes, and this affects whether an empty value
  // is a deletion or a change.
  // Examples, of the form (att1Items, att2Items, resultIsMutation) -> result
  // ([], [(bold, )], true) -> [(bold, )]
  // ([], [(bold, )], false) -> []
  // ([], [(bold, true)], true) -> [(bold, true)]
  // ([], [(bold, true)], false) -> [(bold, true)]
  // ([(bold, true)], [(bold, )], true) -> [(bold, )]
  // ([(bold, true)], [(bold, )], false) -> []

  // pool can be null if att2 has no attributes.

  if ((! att1) && resultIsMutation) {
    // In the case of a mutation (i.e. composing two changesets),
    // an att2 composed with an empy att1 is just att2.  If att1
    // is part of an attribution string, then att2 may remove
    // attributes that are already gone, so don't do this optimization.
    return att2;
  }
  if (! att2) return att1;
  var atts = [];
  att1.replace(/\*([0-9a-z]+)/g, function(_, a) {
    atts.push(pool.getAttrib(Changeset.parseNum(a)));
    return '';
  });
  att2.replace(/\*([0-9a-z]+)/g, function(_, a) {
    var pair = pool.getAttrib(Changeset.parseNum(a));
    var found = false;
    for(var i=0;i<atts.length;i++) {
      var oldPair = atts[i];
      if (oldPair[0] == pair[0]) {
	if (pair[1] || resultIsMutation) {
	  oldPair[1] = pair[1];
	}
	else {
	  atts.splice(i, 1);
	}
	found = true;
	break;
      }
    }
    if ((! found) && (pair[1] || resultIsMutation)) {
      atts.push(pair);
    }
    return '';
  });
  atts.sort();
  var buf = Changeset.stringAssembler();
  for(var i=0;i<atts.length;i++) {
    buf.append('*');
    buf.append(Changeset.numToString(pool.putAttrib(atts[i])));
  }
  //print(att1+" / "+att2+" / "+buf.toString());
  return buf.toString();
};

Changeset._slicerZipperFunc = function(attOp, csOp, opOut, pool) {
  // attOp is the op from the sequence that is being operated on, either an
  // attribution string or the earlier of two changesets being composed.
  // pool can be null if definitely not needed.

  //print(csOp.toSource()+" "+attOp.toSource()+" "+opOut.toSource());
  if (attOp.opcode == '-') {
    Changeset.copyOp(attOp, opOut);
    attOp.opcode = '';
  }
  else if (! attOp.opcode) {
    Changeset.copyOp(csOp, opOut);
    csOp.opcode = '';
  }
  else {
    switch (csOp.opcode) {
    case '-': {
      if (csOp.chars <= attOp.chars) {
	// delete or delete part
	if (attOp.opcode == '=') {
	  opOut.opcode = '-';
	  opOut.chars = csOp.chars;
	  opOut.lines = csOp.lines;
	  opOut.attribs = '';
	}
	attOp.chars -= csOp.chars;
	attOp.lines -= csOp.lines;
	csOp.opcode = '';
	if (! attOp.chars) {
	  attOp.opcode = '';
	}
      }
      else {
	// delete and keep going
	if (attOp.opcode == '=') {
	  opOut.opcode = '-';
	  opOut.chars = attOp.chars;
	  opOut.lines = attOp.lines;
	  opOut.attribs = '';
	}
	csOp.chars -= attOp.chars;
	csOp.lines -= attOp.lines;
	attOp.opcode = '';
      }
      break;
    }
    case '+': {
      // insert
      Changeset.copyOp(csOp, opOut);
      csOp.opcode = '';
      break;
    }
    case '=': {
      if (csOp.chars <= attOp.chars) {
	// keep or keep part
	opOut.opcode = attOp.opcode;
	opOut.chars = csOp.chars;
	opOut.lines = csOp.lines;
	opOut.attribs = Changeset.composeAttributes(attOp.attribs, csOp.attribs,
						    attOp.opcode == '=', pool);
	csOp.opcode = '';
	attOp.chars -= csOp.chars;
	attOp.lines -= csOp.lines;
	if (! attOp.chars) {
	  attOp.opcode = '';
	}
      }
      else {
	// keep and keep going
	opOut.opcode = attOp.opcode;
	opOut.chars = attOp.chars;
	opOut.lines = attOp.lines;
	opOut.attribs = Changeset.composeAttributes(attOp.attribs, csOp.attribs,
						    attOp.opcode == '=', pool);
	attOp.opcode = '';
	csOp.chars -= attOp.chars;
	csOp.lines -= attOp.lines;
      }
      break;
    }
    case '': {
      Changeset.copyOp(attOp, opOut);
      attOp.opcode = '';
      break;
    }
    }
  }
};

Changeset.applyToAttribution = function(cs, astr, pool) {
  var unpacked = Changeset.unpack(cs);

  return Changeset.applyZip(astr, 0, unpacked.ops, 0, function(op1, op2, opOut) {
    return Changeset._slicerZipperFunc(op1, op2, opOut, pool);
  });
};

/*Changeset.oneInsertedLineAtATimeOpIterator = function(opsStr, optStartIndex, charBank) {
  var iter = Changeset.opIterator(opsStr, optStartIndex);
  var bankIndex = 0;

};*/

Changeset.mutateAttributionLines = function(cs, lines, pool) {
  //dmesg(cs);
  //dmesg(lines.toSource()+" ->");

  var unpacked = Changeset.unpack(cs);
  var csIter = Changeset.opIterator(unpacked.ops);
  var csBank = unpacked.charBank;
  var csBankIndex = 0;
  // treat the attribution lines as text lines, mutating a line at a time
  var mut = Changeset.textLinesMutator(lines);

  var lineIter = null;
  function isNextMutOp() {
    return (lineIter && lineIter.hasNext()) || mut.hasMore();
  }
  function nextMutOp(destOp) {
    if ((!(lineIter && lineIter.hasNext())) && mut.hasMore()) {
      var line = mut.removeLines(1);
      lineIter = Changeset.opIterator(line);
    }
    if (lineIter && lineIter.hasNext()) {
      lineIter.next(destOp);
    }
    else {
      destOp.opcode = '';
    }
  }
  var lineAssem = null;
  function outputMutOp(op) {
    //print("outputMutOp: "+op.toSource());
    if (! lineAssem) {
      lineAssem = Changeset.mergingOpAssembler();
    }
    lineAssem.append(op);
    if (op.lines > 0) {
      Changeset.assert(op.lines == 1, "Can't have op.lines of ",op.lines," in attribution lines");
      // ship it to the mut
      mut.insert(lineAssem.toString(), 1);
      lineAssem = null;
    }
  }

  var csOp = Changeset.newOp();
  var attOp = Changeset.newOp();
  var opOut = Changeset.newOp();
  while (csOp.opcode || csIter.hasNext() || attOp.opcode || isNextMutOp()) {
    if ((! csOp.opcode) && csIter.hasNext()) {
      csIter.next(csOp);
    }
    //print(csOp.toSource()+" "+attOp.toSource()+" "+opOut.toSource());
    //print(csOp.opcode+"/"+csOp.lines+"/"+csOp.attribs+"/"+lineAssem+"/"+lineIter+"/"+(lineIter?lineIter.hasNext():null));
    //print("csOp: "+csOp.toSource());
    if ((! csOp.opcode) && (! attOp.opcode) &&
	(! lineAssem) && (! (lineIter && lineIter.hasNext()))) {
      break; // done
    }
    else if (csOp.opcode == '=' && csOp.lines > 0 && (! csOp.attribs) && (! attOp.opcode) &&
	     (! lineAssem) && (! (lineIter && lineIter.hasNext()))) {
      // skip multiple lines; this is what makes small changes not order of the document size
      mut.skipLines(csOp.lines);
      //print("skipped: "+csOp.lines);
      csOp.opcode = '';
    }
    else if (csOp.opcode == '+') {
      if (csOp.lines > 1) {
	var firstLineLen = csBank.indexOf('\n', csBankIndex) + 1 - csBankIndex;
	Changeset.copyOp(csOp, opOut);
	csOp.chars -= firstLineLen;
	csOp.lines--;
	opOut.lines = 1;
	opOut.chars = firstLineLen;
      }
      else {
	Changeset.copyOp(csOp, opOut);
	csOp.opcode = '';
      }
      outputMutOp(opOut);
      csBankIndex += opOut.chars;
      opOut.opcode = '';
    }
    else {
      if ((! attOp.opcode) && isNextMutOp()) {
	nextMutOp(attOp);
      }
      //print("attOp: "+attOp.toSource());
      Changeset._slicerZipperFunc(attOp, csOp, opOut, pool);
      if (opOut.opcode) {
	outputMutOp(opOut);
	opOut.opcode = '';
      }
    }
  }

  Changeset.assert(! lineAssem, "line assembler not finished");
  mut.close();

  //dmesg("-> "+lines.toSource());
};

Changeset.joinAttributionLines = function(theAlines) {
  var assem = Changeset.mergingOpAssembler();
  for(var i=0;i<theAlines.length;i++) {
    var aline = theAlines[i];
    var iter = Changeset.opIterator(aline);
    while (iter.hasNext()) {
      assem.append(iter.next());
    }
  }
  return assem.toString();
};

Changeset.splitAttributionLines = function(attrOps, text) {
  var iter = Changeset.opIterator(attrOps);
  var assem = Changeset.mergingOpAssembler();
  var lines = [];
  var pos = 0;

  function appendOp(op) {
    assem.append(op);
    if (op.lines > 0) {
      lines.push(assem.toString());
      assem.clear();
    }
    pos += op.chars;
  }

  while (iter.hasNext()) {
    var op = iter.next();
    var numChars = op.chars;
    var numLines = op.lines;
    while (numLines > 1) {
      var newlineEnd = text.indexOf('\n', pos)+1;
      Changeset.assert(newlineEnd > 0, "newlineEnd <= 0 in splitAttributionLines");
      op.chars = newlineEnd - pos;
      op.lines = 1;
      appendOp(op);
      numChars -= op.chars;
      numLines -= op.lines;
    }
    if (numLines == 1) {
      op.chars = numChars;
      op.lines = 1;
    }
    appendOp(op);
  }

  return lines;
};

Changeset.splitTextLines = function(text) {
  return text.match(/[^\n]*(?:\n|[^\n]$)/g);
};

Changeset.compose = function(cs1, cs2, pool) {
  var unpacked1 = Changeset.unpack(cs1);
  var unpacked2 = Changeset.unpack(cs2);
  var len1 = unpacked1.oldLen;
  var len2 = unpacked1.newLen;
  Changeset.assert(len2 == unpacked2.oldLen, "mismatched composition");
  var len3 = unpacked2.newLen;
  var bankIter1 = Changeset.stringIterator(unpacked1.charBank);
  var bankIter2 = Changeset.stringIterator(unpacked2.charBank);
  var bankAssem = Changeset.stringAssembler();

  var newOps = Changeset.applyZip(unpacked1.ops, 0, unpacked2.ops, 0, function(op1, op2, opOut) {
    //var debugBuilder = Changeset.stringAssembler();
    //debugBuilder.append(Changeset.opString(op1));
    //debugBuilder.append(',');
    //debugBuilder.append(Changeset.opString(op2));
    //debugBuilder.append(' / ');

    var op1code = op1.opcode;
    var op2code = op2.opcode;
    if (op1code == '+' && op2code == '-') {
      bankIter1.skip(Math.min(op1.chars, op2.chars));
    }
    Changeset._slicerZipperFunc(op1, op2, opOut, pool);
    if (opOut.opcode == '+') {
      if (op2code == '+') {
	bankAssem.append(bankIter2.take(opOut.chars));
      }
      else {
	bankAssem.append(bankIter1.take(opOut.chars));
      }
    }

    //debugBuilder.append(Changeset.opString(op1));
    //debugBuilder.append(',');
    //debugBuilder.append(Changeset.opString(op2));
    //debugBuilder.append(' -> ');
    //debugBuilder.append(Changeset.opString(opOut));
    //print(debugBuilder.toString());
  });

  return Changeset.pack(len1, len3, newOps, bankAssem.toString());
};

Changeset.attributeTester = function(attribPair, pool) {
  // returns a function that tests if a string of attributes
  // (e.g. *3*4) contains a given attribute key,value that
  // is already present in the pool.
  if (! pool) {
    return never;
  }
  var attribNum = pool.putAttrib(attribPair, true);
  if (attribNum < 0) {
    return never;
  }
  else {
    var re = new RegExp('\\*'+Changeset.numToString(attribNum)+
                        '(?!\\w)');
    return function(attribs) {
      return re.test(attribs);
    };
  }
  function never(attribs) { return false; }
};

Changeset.identity = function(N) {
  return Changeset.pack(N, N, "", "");
};

Changeset.makeSplice = function(oldFullText, spliceStart, numRemoved, newText, optNewTextAPairs, pool) {
  var oldLen = oldFullText.length;

  if (spliceStart >= oldLen) {
    spliceStart = oldLen - 1;
  }
  if (numRemoved > oldFullText.length - spliceStart - 1) {
    numRemoved = oldFullText.length - spliceStart - 1;
  }
  var oldText = oldFullText.substring(spliceStart, spliceStart+numRemoved);
  var newLen = oldLen + newText.length - oldText.length;

  var assem = Changeset.smartOpAssembler();
  assem.appendOpWithText('=', oldFullText.substring(0, spliceStart));
  assem.appendOpWithText('-', oldText);
  assem.appendOpWithText('+', newText, optNewTextAPairs, pool);
  assem.endDocument();
  return Changeset.pack(oldLen, newLen, assem.toString(), newText);
};

Changeset.toSplices = function(cs) {
  // get a list of splices, [startChar, endChar, newText]

  var unpacked = Changeset.unpack(cs);
  var splices = [];

  var oldPos = 0;
  var iter = Changeset.opIterator(unpacked.ops);
  var charIter = Changeset.stringIterator(unpacked.charBank);
  var inSplice = false;
  while (iter.hasNext()) {
    var op = iter.next();
    if (op.opcode == '=') {
      oldPos += op.chars;
      inSplice = false;
    }
    else {
      if (! inSplice) {
	splices.push([oldPos, oldPos, ""]);
	inSplice = true;
      }
      if (op.opcode == '-') {
	oldPos += op.chars;
	splices[splices.length-1][1] += op.chars;
      }
      else if (op.opcode == '+') {
	splices[splices.length-1][2] += charIter.take(op.chars);
      }
    }
  }

  return splices;
};

Changeset.characterRangeFollow = function(cs, startChar, endChar, insertionsAfter) {
  var newStartChar = startChar;
  var newEndChar = endChar;
  var splices = Changeset.toSplices(cs);
  var lengthChangeSoFar = 0;
  for(var i=0;i<splices.length;i++) {
    var splice = splices[i];
    var spliceStart = splice[0] + lengthChangeSoFar;
    var spliceEnd = splice[1] + lengthChangeSoFar;
    var newTextLength = splice[2].length;
    var thisLengthChange = newTextLength - (spliceEnd - spliceStart);

    if (spliceStart <= newStartChar && spliceEnd >= newEndChar) {
      // splice fully replaces/deletes range
      // (also case that handles insertion at a collapsed selection)
      if (insertionsAfter) {
	newStartChar = newEndChar = spliceStart;
      }
      else {
	newStartChar = newEndChar = spliceStart + newTextLength;
      }
    }
    else if (spliceEnd <= newStartChar) {
      // splice is before range
      newStartChar += thisLengthChange;
      newEndChar += thisLengthChange;
    }
    else if (spliceStart >= newEndChar) {
      // splice is after range
    }
    else if (spliceStart >= newStartChar && spliceEnd <= newEndChar) {
      // splice is inside range
      newEndChar += thisLengthChange;
    }
    else if (spliceEnd < newEndChar) {
      // splice overlaps beginning of range
      newStartChar = spliceStart + newTextLength;
      newEndChar += thisLengthChange;
    }
    else {
      // splice overlaps end of range
      newEndChar = spliceStart;
    }

    lengthChangeSoFar += thisLengthChange;
  }

  return [newStartChar, newEndChar];
};

Changeset.moveOpsToNewPool = function(cs, oldPool, newPool) {
  // works on changeset or attribution string
  var dollarPos = cs.indexOf('$');
  if (dollarPos < 0) {
    dollarPos = cs.length;
  }
  var upToDollar = cs.substring(0, dollarPos);
  var fromDollar = cs.substring(dollarPos);
  // order of attribs stays the same
  return upToDollar.replace(/\*([0-9a-z]+)/g, function(_, a) {
    var oldNum = Changeset.parseNum(a);
    var pair = oldPool.getAttrib(oldNum);
    var newNum = newPool.putAttrib(pair);
    return '*'+Changeset.numToString(newNum);
  }) + fromDollar;
};

Changeset.makeAttribution = function(text) {
  var assem = Changeset.smartOpAssembler();
  assem.appendOpWithText('+', text);
  return assem.toString();
};

// callable on a changeset, attribution string, or attribs property of an op
Changeset.eachAttribNumber = function(cs, func) {
  var dollarPos = cs.indexOf('$');
  if (dollarPos < 0) {
    dollarPos = cs.length;
  }
  var upToDollar = cs.substring(0, dollarPos);

  upToDollar.replace(/\*([0-9a-z]+)/g, function(_, a) {
    func(Changeset.parseNum(a));
    return '';
  });
};

// callable on a changeset, attribution string, or attribs property of an op,
// though it may easily create adjacent ops that can be merged.
Changeset.filterAttribNumbers = function(cs, filter) {
  return Changeset.mapAttribNumbers(cs, filter);
};

Changeset.mapAttribNumbers = function(cs, func) {
  var dollarPos = cs.indexOf('$');
  if (dollarPos < 0) {
    dollarPos = cs.length;
  }
  var upToDollar = cs.substring(0, dollarPos);

  var newUpToDollar = upToDollar.replace(/\*([0-9a-z]+)/g, function(s, a) {
    var n = func(Changeset.parseNum(a));
    if (n === true) {
      return s;
    }
    else if ((typeof n) === "number") {
      return '*'+Changeset.numToString(n);
    }
    else {
      return '';
    }
  });

  return newUpToDollar + cs.substring(dollarPos);
};

Changeset.makeAText = function(text, attribs) {
  return { text: text, attribs: (attribs || Changeset.makeAttribution(text)) };
};

Changeset.applyToAText = function(cs, atext, pool) {
  return { text: Changeset.applyToText(cs, atext.text),
	   attribs: Changeset.applyToAttribution(cs, atext.attribs, pool) };
};

Changeset.cloneAText = function(atext) {
  return { text: atext.text, attribs: atext.attribs };
};

Changeset.copyAText = function(atext1, atext2) {
  atext2.text = atext1.text;
  atext2.attribs = atext1.attribs;
};

Changeset.appendATextToAssembler = function(atext, assem) {
  // intentionally skips last newline char of atext
  var iter = Changeset.opIterator(atext.attribs);
  var op = Changeset.newOp();
  while (iter.hasNext()) {
    iter.next(op);
    if (! iter.hasNext()) {
      // last op, exclude final newline
      if (op.lines <= 1) {
	op.lines = 0;
	op.chars--;
	if (op.chars) {
	  assem.append(op);
	}
      }
      else {
	var nextToLastNewlineEnd =
	  atext.text.lastIndexOf('\n', atext.text.length-2) + 1;
	var lastLineLength = atext.text.length - nextToLastNewlineEnd - 1;
	op.lines--;
	op.chars -= (lastLineLength + 1);
	assem.append(op);
	op.lines = 0;
	op.chars = lastLineLength;
	if (op.chars) {
	  assem.append(op);
	}
      }
    }
    else {
      assem.append(op);
    }
  }
};

Changeset.prepareForWire = function(cs, pool) {
  var newPool = new AttribPool();
  var newCs = Changeset.moveOpsToNewPool(cs, pool, newPool);
  return {translated: newCs, pool: newPool};
};

Changeset.isIdentity = function(cs) {
  var unpacked = Changeset.unpack(cs);
  return unpacked.ops == "" && unpacked.oldLen == unpacked.newLen;
};

Changeset.opAttributeValue = function(op, key, pool) {
  return Changeset.attribsAttributeValue(op.attribs, key, pool);
};

Changeset.attribsAttributeValue = function(attribs, key, pool) {
  var value = '';
  if (attribs) {
    Changeset.eachAttribNumber(attribs, function(n) {
      if (pool.getAttribKey(n) == key) {
        value = pool.getAttribValue(n);
      }
    });
  }
  return value;
};

Changeset.builder = function(oldLen) {
  var assem = Changeset.smartOpAssembler();
  var o = Changeset.newOp();
  var charBank = Changeset.stringAssembler();

  var self = {
    // attribs are [[key1,value1],[key2,value2],...] or '*0*1...' (no pool needed in latter case)
    keep: function(N, L, attribs, pool) {
      o.opcode = '=';
      o.attribs = (attribs &&
                   Changeset.makeAttribsString('=', attribs, pool)) || '';
      o.chars = N;
      o.lines = (L || 0);
      assem.append(o);
      return self;
    },
    keepText: function(text, attribs, pool) {
      assem.appendOpWithText('=', text, attribs, pool);
      return self;
    },
    insert: function(text, attribs, pool) {
      assem.appendOpWithText('+', text, attribs, pool);
      charBank.append(text);
      return self;
    },
    remove: function(N, L) {
      o.opcode = '-';
      o.attribs = '';
      o.chars = N;
      o.lines = (L || 0);
      assem.append(o);
      return self;
    },
    toString: function() {
      assem.endDocument();
      var newLen = oldLen + assem.getLengthChange();
      return Changeset.pack(oldLen, newLen, assem.toString(),
			    charBank.toString());
    }
  };

  return self;
};

Changeset.makeAttribsString = function(opcode, attribs, pool) {
  // makeAttribsString(opcode, '*3') or makeAttribsString(opcode, [['foo','bar']], myPool) work
  if (! attribs) {
    return '';
  }
  else if ((typeof attribs) == "string") {
    return attribs;
  }
  else if (pool && attribs && attribs.length) {
    if (attribs.length > 1) {
      attribs = attribs.slice();
      attribs.sort();
    }
    var result = [];
    for(var i=0;i<attribs.length;i++) {
      var pair = attribs[i];
      if (opcode == '=' || (opcode == '+' && pair[1])) {
	result.push('*'+Changeset.numToString(pool.putAttrib(pair)));
      }
    }
    return result.join('');
  }
};

// like "substring" but on a single-line attribution string
Changeset.subattribution = function(astr, start, optEnd) {
  var iter = Changeset.opIterator(astr, 0);
  var assem = Changeset.smartOpAssembler();
  var attOp = Changeset.newOp();
  var csOp = Changeset.newOp();
  var opOut = Changeset.newOp();

  function doCsOp() {
    if (csOp.chars) {
      while (csOp.opcode && (attOp.opcode || iter.hasNext())) {
	if (! attOp.opcode) iter.next(attOp);

	if (csOp.opcode && attOp.opcode && csOp.chars >= attOp.chars &&
	    attOp.lines > 0 && csOp.lines <= 0) {
	  csOp.lines++;
	}

	Changeset._slicerZipperFunc(attOp, csOp, opOut, null);
	if (opOut.opcode) {
	  assem.append(opOut);
	  opOut.opcode = '';
	}
      }
    }
  }

  csOp.opcode = '-';
  csOp.chars = start;

  doCsOp();

  if (optEnd === undefined) {
    if (attOp.opcode) {
      assem.append(attOp);
    }
    while (iter.hasNext()) {
      iter.next(attOp);
      assem.append(attOp);
    }
  }
  else {
    csOp.opcode = '=';
    csOp.chars = optEnd - start;
    doCsOp();
  }

  return assem.toString();
};

Changeset.inverse = function(cs, lines, alines, pool) {
  // lines and alines are what the changeset is meant to apply to.
  // They may be arrays or objects with .get(i) and .length methods.
  // They include final newlines on lines.
  function lines_get(idx) {
    if (lines.get) {
      return lines.get(idx);
    }
    else {
      return lines[idx];
    }
  }
  function lines_length() {
    if ((typeof lines.length) == "number") {
      return lines.length;
    }
    else {
      return lines.length();
    }
  }
  function alines_get(idx) {
    if (alines.get) {
      return alines.get(idx);
    }
    else {
      return alines[idx];
    }
  }
  function alines_length() {
    if ((typeof alines.length) == "number") {
      return alines.length;
    }
    else {
      return alines.length();
    }
  }

  var curLine = 0;
  var curChar = 0;
  var curLineOpIter = null;
  var curLineOpIterLine;
  var curLineNextOp = Changeset.newOp('+');

  var unpacked = Changeset.unpack(cs);
  var csIter = Changeset.opIterator(unpacked.ops);
  var builder = Changeset.builder(unpacked.newLen);

  function consumeAttribRuns(numChars, func/*(len, attribs, endsLine)*/) {

    if ((! curLineOpIter) || (curLineOpIterLine != curLine)) {
      // create curLineOpIter and advance it to curChar
      curLineOpIter = Changeset.opIterator(alines_get(curLine));
      curLineOpIterLine = curLine;
      var indexIntoLine = 0;
      var done = false;
      while (! done) {
	curLineOpIter.next(curLineNextOp);
	if (indexIntoLine + curLineNextOp.chars >= curChar) {
	  curLineNextOp.chars -= (curChar - indexIntoLine);
	  done = true;
	}
	else {
	  indexIntoLine += curLineNextOp.chars;
	}
      }
    }

    while (numChars > 0) {
      if ((! curLineNextOp.chars) && (! curLineOpIter.hasNext())) {
	curLine++;
	curChar = 0;
	curLineOpIterLine = curLine;
	curLineNextOp.chars = 0;
	curLineOpIter = Changeset.opIterator(alines_get(curLine));
      }
      if (! curLineNextOp.chars) {
	curLineOpIter.next(curLineNextOp);
      }
      var charsToUse = Math.min(numChars, curLineNextOp.chars);
      func(charsToUse, curLineNextOp.attribs,
	   charsToUse == curLineNextOp.chars && curLineNextOp.lines > 0);
      numChars -= charsToUse;
      curLineNextOp.chars -= charsToUse;
      curChar += charsToUse;
    }

    if ((! curLineNextOp.chars) && (! curLineOpIter.hasNext())) {
      curLine++;
      curChar = 0;
    }
  }

  function skip(N, L) {
    if (L) {
      curLine += L;
      curChar = 0;
    }
    else {
      if (curLineOpIter && curLineOpIterLine == curLine) {
	consumeAttribRuns(N, function() {});
      }
      else {
	curChar += N;
      }
    }
  }

  function nextText(numChars) {
    var len = 0;
    var assem = Changeset.stringAssembler();
    var firstString = lines_get(curLine).substring(curChar);
    len += firstString.length;
    assem.append(firstString);

    var lineNum = curLine+1;
    while (len < numChars) {
      var nextString = lines_get(lineNum);
      len += nextString.length;
      assem.append(nextString);
      lineNum++;
    }

    return assem.toString().substring(0, numChars);
  }

  function cachedStrFunc(func) {
    var cache = {};
    return function(s) {
      if (! cache[s]) {
	cache[s] = func(s);
      }
      return cache[s];
    };
  }

  var attribKeys = [];
  var attribValues = [];
  while (csIter.hasNext()) {
    var csOp = csIter.next();
    if (csOp.opcode == '=') {
      if (csOp.attribs) {
	attribKeys.length = 0;
	attribValues.length = 0;
	Changeset.eachAttribNumber(csOp.attribs, function(n) {
	  attribKeys.push(pool.getAttribKey(n));
	  attribValues.push(pool.getAttribValue(n));
	});
	var undoBackToAttribs = cachedStrFunc(function(attribs) {
	  var backAttribs = [];
	  for(var i=0;i<attribKeys.length;i++) {
	    var appliedKey = attribKeys[i];
	    var appliedValue = attribValues[i];
	    var oldValue = Changeset.attribsAttributeValue(attribs, appliedKey, pool);
	    if (appliedValue != oldValue) {
	      backAttribs.push([appliedKey, oldValue]);
	    }
	  }
	  return Changeset.makeAttribsString('=', backAttribs, pool);
	});
	consumeAttribRuns(csOp.chars, function(len, attribs, endsLine) {
	  builder.keep(len, endsLine ? 1 : 0, undoBackToAttribs(attribs));
	});
      }
      else {
	skip(csOp.chars, csOp.lines);
	builder.keep(csOp.chars, csOp.lines);
      }
    }
    else if (csOp.opcode == '+') {
      builder.remove(csOp.chars, csOp.lines);
    }
    else if (csOp.opcode == '-') {
      var textBank = nextText(csOp.chars);
      var textBankIndex = 0;
      consumeAttribRuns(csOp.chars, function(len, attribs, endsLine) {
	builder.insert(textBank.substr(textBankIndex, len), attribs);
	textBankIndex += len;
      });
    }
  }

  return Changeset.checkRep(builder.toString());
};

// %CLIENT FILE ENDS HERE%

Changeset.follow = function(cs1, cs2, reverseInsertOrder, pool) {
  var unpacked1 = Changeset.unpack(cs1);
  var unpacked2 = Changeset.unpack(cs2);
  var len1 = unpacked1.oldLen;
  var len2 = unpacked2.oldLen;
  Changeset.assert(len1 == len2, "mismatched follow");
  var chars1 = Changeset.stringIterator(unpacked1.charBank);
  var chars2 = Changeset.stringIterator(unpacked2.charBank);

  var oldLen = unpacked1.newLen;
  var oldPos = 0;
  var newLen = 0;

  var hasInsertFirst = Changeset.attributeTester(['insertorder','first'],
                                                 pool);

  var newOps = Changeset.applyZip(unpacked1.ops, 0, unpacked2.ops, 0, function(op1, op2, opOut) {
    if (op1.opcode == '+' || op2.opcode == '+') {
      var whichToDo;
      if (op2.opcode != '+') {
	whichToDo = 1;
      }
      else if (op1.opcode != '+') {
	whichToDo = 2;
      }
      else {
	// both +
	var firstChar1 = chars1.peek(1);
	var firstChar2 = chars2.peek(1);
        var insertFirst1 = hasInsertFirst(op1.attribs);
        var insertFirst2 = hasInsertFirst(op2.attribs);
        if (insertFirst1 && ! insertFirst2) {
          whichToDo = 1;
        }
        else if (insertFirst2 && ! insertFirst1) {
          whichToDo = 2;
        }
	// insert string that doesn't start with a newline first so as not to break up lines
	else if (firstChar1 == '\n' && firstChar2 != '\n') {
	  whichToDo = 2;
	}
	else if (firstChar1 != '\n' && firstChar2 == '\n') {
	  whichToDo = 1;
	}
	// break symmetry:
	else if (reverseInsertOrder) {
	  whichToDo = 2;
	}
	else {
	  whichToDo = 1;
	}
      }
      if (whichToDo == 1) {
	chars1.skip(op1.chars);
	opOut.opcode = '=';
	opOut.lines = op1.lines;
	opOut.chars = op1.chars;
	opOut.attribs = '';
	op1.opcode = '';
      }
      else {
	// whichToDo == 2
	chars2.skip(op2.chars);
	Changeset.copyOp(op2, opOut);
	op2.opcode = '';
      }
    }
    else if (op1.opcode == '-') {
      if (! op2.opcode) {
	op1.opcode = '';
      }
      else {
	if (op1.chars <= op2.chars) {
	  op2.chars -= op1.chars;
	  op2.lines -= op1.lines;
	  op1.opcode = '';
	  if (! op2.chars) {
	    op2.opcode = '';
	  }
	}
	else {
	  op1.chars -= op2.chars;
	  op1.lines -= op2.lines;
	  op2.opcode = '';
	}
      }
    }
    else if (op2.opcode == '-') {
      Changeset.copyOp(op2, opOut);
      if (! op1.opcode) {
	op2.opcode = '';
      }
      else if (op2.chars <= op1.chars) {
	// delete part or all of a keep
	op1.chars -= op2.chars;
	op1.lines -= op2.lines;
	op2.opcode = '';
	if (! op1.chars) {
	  op1.opcode = '';
	}
      }
      else {
	// delete all of a keep, and keep going
	opOut.lines = op1.lines;
	opOut.chars = op1.chars;
	op2.lines -= op1.lines;
	op2.chars -= op1.chars;
	op1.opcode = '';
      }
    }
    else if (! op1.opcode) {
      Changeset.copyOp(op2, opOut);
      op2.opcode = '';
    }
    else if (! op2.opcode) {
      Changeset.copyOp(op1, opOut);
      op1.opcode = '';
    }
    else {
      // both keeps
      opOut.opcode = '=';
      opOut.attribs = Changeset.followAttributes(op1.attribs, op2.attribs, pool);
      if (op1.chars <= op2.chars) {
	opOut.chars = op1.chars;
	opOut.lines = op1.lines;
	op2.chars -= op1.chars;
	op2.lines -= op1.lines;
	op1.opcode = '';
	if (! op2.chars) {
	  op2.opcode = '';
	}
      }
      else {
	opOut.chars = op2.chars;
	opOut.lines = op2.lines;
	op1.chars -= op2.chars;
	op1.lines -= op2.lines;
	op2.opcode = '';
      }
    }
    switch (opOut.opcode) {
    case '=': oldPos += opOut.chars; newLen += opOut.chars; break;
    case '-': oldPos += opOut.chars; break;
    case '+': newLen += opOut.chars; break;
    }
  });
  newLen += oldLen - oldPos;

  return Changeset.pack(oldLen, newLen, newOps, unpacked2.charBank);
};

Changeset.followAttributes = function(att1, att2, pool) {
  // The merge of two sets of attribute changes to the same text
  // takes the lexically-earlier value if there are two values
  // for the same key.  Otherwise, all key/value changes from
  // both attribute sets are taken.  This operation is the "follow",
  // so a set of changes is produced that can be applied to att1
  // to produce the merged set.
  if ((! att2) || (! pool)) return '';
  if (! att1) return att2;
  var atts = [];
  att2.replace(/\*([0-9a-z]+)/g, function(_, a) {
    atts.push(pool.getAttrib(Changeset.parseNum(a)));
    return '';
  });
  att1.replace(/\*([0-9a-z]+)/g, function(_, a) {
    var pair1 = pool.getAttrib(Changeset.parseNum(a));
    for(var i=0;i<atts.length;i++) {
      var pair2 = atts[i];
      if (pair1[0] == pair2[0]) {
	if (pair1[1] <= pair2[1]) {
	  // winner of merge is pair1, delete this attribute
	  atts.splice(i, 1);
	}
	break;
      }
    }
    return '';
  });
  // we've only removed attributes, so they're already sorted
  var buf = Changeset.stringAssembler();
  for(var i=0;i<atts.length;i++) {
    buf.append('*');
    buf.append(Changeset.numToString(pool.putAttrib(atts[i])));
  }
  return buf.toString();
};
