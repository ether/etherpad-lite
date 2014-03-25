/*
 * This is the Changeset library copied from the old Etherpad with some modifications to use it in node.js
 * Can be found in https://github.com/ether/pad/blob/master/infrastructure/ace/www/easysync2.js
 */

/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

/*
 * Copyright 2009 Google Inc., 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
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

var AttributePool = require("./AttributePool");

/**
 * ==================== General Util Functions =======================
 */

/**
 * This method is called whenever there is an error in the sync process
 * @param msg {string} Just some message
 */
exports.error = function error(msg) {
  var e = new Error(msg);
  e.easysync = true;
  throw e;
};

/**
 * This method is used for assertions with Messages 
 * if assert fails, the error function is called.
 * @param b {boolean} assertion condition
 * @param msgParts {string} error to be passed if it fails
 */
exports.assert = function assert(b, msgParts) {
  if (!b) {
    var msg = Array.prototype.slice.call(arguments, 1).join('');
    exports.error("Failed assertion: " + msg);
  }
};

/**
 * Parses a number from string base 36
 * @param str {string} string of the number in base 36
 * @returns {int} number
 */
exports.parseNum = function (str) {
  return parseInt(str, 36);
};

/**
 * Writes a number in base 36 and puts it in a string
 * @param num {int} number
 * @returns {string} string
 */
exports.numToString = function (num) {
  return num.toString(36).toLowerCase();
};

/**
 * Converts stuff before $ to base 10
 * @obsolete not really used anywhere??
 * @param cs {string} the string
 * @return integer 
 */
exports.toBaseTen = function (cs) {
  var dollarIndex = cs.indexOf('$');
  var beforeDollar = cs.substring(0, dollarIndex);
  var fromDollar = cs.substring(dollarIndex);
  return beforeDollar.replace(/[0-9a-z]+/g, function (s) {
    return String(exports.parseNum(s));
  }) + fromDollar;
};


/**
 * ==================== Changeset Functions =======================
 */

/**
 * returns the required length of the text before changeset 
 * can be applied
 * @param cs {string} String representation of the Changeset
 */ 
exports.oldLen = function (cs) {
  return exports.unpack(cs).oldLen;
};

/**
 * returns the length of the text after changeset is applied
 * @param cs {string} String representation of the Changeset
 */ 
exports.newLen = function (cs) {
  return exports.unpack(cs).newLen;
};

/**
 * this function creates an iterator which decodes string changeset operations
 * @param opsStr {string} String encoding of the change operations to be performed 
 * @param optStartIndex {int} from where in the string should the iterator start 
 * @return {Op} type object iterator 
 */
function OpIterator(opsStr, optStartIndex) {
  if(!(this instanceof OpIterator)) {
    return new OpIterator(opsStr, optStartIndex);
  }

  this._regex = /((?:\*[0-9a-z]+)*)(?:\|([0-9a-z]+))?([-+=])([0-9a-z]+)|\?|/g;
  this._curIndex = (optStartIndex || 0);
  this._prevIndex = this.curIndex;

  this._opsStr = opsStr;

  this._regexResult = this._nextRegexMatch();
  this._obj = exports.newOp();
}
exports.opIterator = OpIterator;

OpIterator.prototype._nextRegexMatch = function() {
  this._prevIndex = this._curIndex;
  this._regex.lastIndex = this._curIndex;
  var result = this._regex.exec(this._opsStr);
  this._curIndex = this._regex.lastIndex;
  if (result[0] == '?') {
    exports.error("Hit error opcode in op stream");
  }
  return result;
}

OpIterator.prototype.next = function(optObj) {
  var op = (optObj || this._obj);
  if (this._regexResult[0]) {
    op.attribs = this._regexResult[1];
    op.lines = exports.parseNum(this._regexResult[2] || 0);
    op.opcode = this._regexResult[3];
    op.chars = exports.parseNum(this._regexResult[4]);
    this._regexResult = this._nextRegexMatch();
  } else {
    exports.clearOp(op);
  }
  return op;
}

OpIterator.prototype.hasNext = function() {
  return !!(this._regexResult[0]);
}

OpIterator.prototype.lastIndex = function() {
  return this._prevIndex;
}

/**
 * Cleans an Op object
 * @param {Op} object to be cleared
 */
exports.clearOp = function (op) {
  op.opcode = '';
  op.chars = 0;
  op.lines = 0;
  op.attribs = '';
};

/**
 * Creates a new Op object
 * @param optOpcode the type operation of the Op object
 */
exports.newOp = function (optOpcode) {
  return {
    opcode: (optOpcode || ''),
    chars: 0,
    lines: 0,
    attribs: ''
  };
};

/**
 * Clones an Op
 * @param op Op to be cloned
 */
exports.cloneOp = function (op) {
  return {
    opcode: op.opcode,
    chars: op.chars,
    lines: op.lines,
    attribs: op.attribs
  };
};

/**
 * Copies op1 to op2
 * @param op1 src Op
 * @param op2 dest Op
 */
exports.copyOp = function (op1, op2) {
  op2.opcode = op1.opcode;
  op2.chars = op1.chars;
  op2.lines = op1.lines;
  op2.attribs = op1.attribs;
};

/**
 * Writes the Op in a string the way that changesets need it
 */
exports.opString = function (op) {
  // just for debugging
  if (!op.opcode) return 'null';
  var assem = exports.opAssembler();
  assem.append(op);
  return assem.toString();
};

/**
 * Used just for debugging
 */
exports.stringOp = function (str) {
  // just for debugging
  return exports.opIterator(str).next();
};

/**
 * Used to check if a Changeset if valid
 * @param cs {Changeset} Changeset to be checked
 */
exports.checkRep = function (cs) {
  // doesn't check things that require access to attrib pool (e.g. attribute order)
  // or original string (e.g. newline positions)
  var unpacked = exports.unpack(cs);
  var oldLen = unpacked.oldLen;
  var newLen = unpacked.newLen;
  var ops = unpacked.ops;
  var charBank = unpacked.charBank;

  var assem = exports.smartOpAssembler();
  var oldPos = 0;
  var calcNewLen = 0;
  var numInserted = 0;
  var iter = exports.opIterator(ops);
  while (iter.hasNext()) {
    var o = iter.next();
    switch (o.opcode) {
    case '=':
      oldPos += o.chars;
      calcNewLen += o.chars;
      break;
    case '-':
      oldPos += o.chars;
      exports.assert(oldPos < oldLen, oldPos, " >= ", oldLen, " in ", cs);
      break;
    case '+':
      {
        calcNewLen += o.chars;
        numInserted += o.chars;
        exports.assert(calcNewLen < newLen, calcNewLen, " >= ", newLen, " in ", cs);
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
  var normalized = exports.pack(oldLen, calcNewLen, assem.toString(), charBank);
  exports.assert(normalized == cs, normalized, ' != ', cs);

  return cs;
}


/**
 * ==================== Util Functions =======================
 */

/**
 * creates an object that allows you to append operations (type Op) and also
 * compresses them if possible
 */
function SmartOpAssembler() {
  if(!(this instanceof SmartOpAssembler)) {
    return new SmartOpAssembler();
  }

  // Like opAssembler but able to produce conforming exportss
  // from slightly looser input, at the cost of speed.
  // Specifically:
  // - merges consecutive operations that can be merged
  // - strips final "="
  // - ignores 0-length changes
  // - reorders consecutive + and - (which margingOpAssembler doesn't do)
  this._minusAssem = exports.mergingOpAssembler();
  this._plusAssem = exports.mergingOpAssembler();
  this._keepAssem = exports.mergingOpAssembler();
  this._assem = exports.stringAssembler();
  this._lastOpcode = '';
  this._lengthChange = 0;
}
exports.smartOpAssembler = SmartOpAssembler;

SmartOpAssembler.prototype._flushKeeps = function() {
  this._assem.append(this._keepAssem.toString());
  this._keepAssem.clear();
}

SmartOpAssembler.prototype._flushPlusMinus = function() {
  this._assem.append(this._minusAssem.toString());
  this._minusAssem.clear();
  this._assem.append(this._plusAssem.toString());
  this._plusAssem.clear();
}

SmartOpAssembler.prototype.append = function(op) {
  if (!op.opcode) return;
  if (!op.chars) return;

  if (op.opcode == '-') {
    if (this._lastOpcode == '=') {
      this._flushKeeps();
    }
    this._minusAssem.append(op);
    this._lengthChange -= op.chars;
  } else if (op.opcode == '+') {
    if (this._lastOpcode == '=') {
      this._flushKeeps();
    }
    this._plusAssem.append(op);
    this._lengthChange += op.chars;
  } else if (op.opcode == '=') {
    if (this._lastOpcode != '=') {
      this._flushPlusMinus();
    }
    this._keepAssem.append(op);
  }
  this._lastOpcode = op.opcode;
}

SmartOpAssembler.prototype.appendOpWithText = function(opcode, text, attribs, pool) {
  var op = exports.newOp(opcode);
  op.attribs = exports.makeAttribsString(opcode, attribs, pool);
  var lastNewlinePos = text.lastIndexOf('\n');
  if (lastNewlinePos < 0) {
    op.chars = text.length;
    op.lines = 0;
    this.append(op);
  } else {
    op.chars = lastNewlinePos + 1;
    op.lines = text.match(/\n/g).length;
    this.append(op);
    op.chars = text.length - (lastNewlinePos + 1);
    op.lines = 0;
    this.append(op);
  }
}

SmartOpAssembler.prototype.toString = function() {
  this._flushPlusMinus();
  this._flushKeeps();
  return this._assem.toString();
}

SmartOpAssembler.prototype.clear = function() {
  this._minusAssem.clear();
  this._plusAssem.clear();
  this._keepAssem.clear();
  this._assem.clear();
  this._lastOpcode = '';
  this._lengthChange = 0;
}

SmartOpAssembler.prototype.endDocument = function() {
  this._keepAssem.endDocument();
}

SmartOpAssembler.prototype.getLengthChange = function() {
  return this._lengthChange;
}

function MergingOpAssembler() {
  if(!(this instanceof MergingOpAssembler)) {
    return new MergingOpAssembler();
  }
  // This assembler can be used in production; it efficiently
  // merges consecutive operations that are mergeable, ignores
  // no-ops, and drops final pure "keeps".  It does not re-order
  // operations.
  this._assem = exports.opAssembler();
  this._bufOp = exports.newOp();

  // If we get, for example, insertions [xxx\n,yyy], those don't merge,
  // but if we get [xxx\n,yyy,zzz\n], that merges to [xxx\nyyyzzz\n].
  // This variable stores the length of yyy and any other newline-less
  // ops immediately after it.
  this._bufOpAdditionalCharsAfterNewline = 0;
}
exports.mergingOpAssembler = MergingOpAssembler;

MergingOpAssembler.prototype._flush = function(isEndDocument) {
  if (this._bufOp.opcode) {
    if (isEndDocument && this._bufOp.opcode == '=' && !this._bufOp.attribs) {
      // final merged keep, leave it implicit
    } else {
      this._assem.append(this._bufOp);
      if (this._bufOpAdditionalCharsAfterNewline) {
        this._bufOp.chars = this._bufOpAdditionalCharsAfterNewline;
        this._bufOp.lines = 0;
        this._assem.append(this._bufOp);
        this._bufOpAdditionalCharsAfterNewline = 0;
      }
    }
    this._bufOp.opcode = '';
  }
}

MergingOpAssembler.prototype.append = function(op) {
  if (op.chars > 0) {
    if (this._bufOp.opcode == op.opcode && this._bufOp.attribs == op.attribs) {
      if (op.lines > 0) {
        // bufOp and additional chars are all mergeable into a multi-line op
        this._bufOp.chars += this._bufOpAdditionalCharsAfterNewline + op.chars;
        this._bufOp.lines += op.lines;
        this._bufOpAdditionalCharsAfterNewline = 0;
      } else if (this._bufOp.lines == 0) {
        // both bufOp and op are in-line
        this._bufOp.chars += op.chars;
      } else {
        // append in-line text to multi-line bufOp
        this._bufOpAdditionalCharsAfterNewline += op.chars;
      }
    } else {
      this._flush();
      exports.copyOp(op, this._bufOp);
    }
  }
}

MergingOpAssembler.prototype.endDocument = function() {
  this._flush(true);
}

MergingOpAssembler.prototype.toString = function() {
  this._flush();
  return this._assem.toString();
}

MergingOpAssembler.prototype.clear = function() {
  this._assem.clear();
  exports.clearOp(this._bufOp);
}

function OpAssembler() {
  if(!(this instanceof OpAssembler)) {
    return new OpAssembler();
  }

  this._s = '';
}
exports.opAssembler = OpAssembler;

  // this function allows op to be mutated later (doesn't keep a ref)
OpAssembler.prototype.append = function(op) {
  this._s += (op.attribs || '') + (op.lines ? ('|' + exports.numToString(op.lines)) : '') 
    + op.opcode + exports.numToString(op.chars);
}

OpAssembler.prototype.toString = function() {
  return this._s;
}

OpAssembler.prototype.clear = function() {
  this._s = '';
}

/**
 * A custom made String Iterator
 * @param str {string} String to be iterated over
 */ 
function StringIterator(str) {
  if(!(this instanceof StringIterator))
    return new StringIterator(str);

  this._str = str;
  this._curIndex = 0;
}
exports.stringIterator = StringIterator;

StringIterator.prototype._assertRemaining = function(n) {
  exports.assert(n <= this.remaining(), "!(", n, " <= ", this.remaining(), ")");
}

StringIterator.prototype.take = function(n) {
  this._assertRemaining(n);
  var s = this._str.substr(this._curIndex, n);
  this._curIndex += n;
  return s;
}

StringIterator.prototype.peek = function(n) {
  this._assertRemaining(n);
  var s = this._str.substr(this._curIndex, n);
  return s;
}

StringIterator.prototype.skip = function(n) {
  this._assertRemaining(n);
  this._curIndex += n;
}

StringIterator.prototype.remaining = function() {
  return this._str.length - this._curIndex;
}

/**
 * A custom made StringBuffer 
 */
function StringAssembler() {
  if(!(this instanceof StringAssembler)) {
    return new StringAssembler();
  }

  this._s = '';
}
exports.stringAssembler = StringAssembler;

StringAssembler.prototype.append = function(x) {
  this._s += x;
}

StringAssembler.prototype.toString = function() {
  return this._s;
}

/*
 * A lines wrapper class, provides an interface for working with collection of lines. Underneath implementation
 * can vary.
 */
function LinesCollection(lines) {
  this._lines = lines;
}

LinesCollection.prototype.get = function(index) {
  if(this._lines.get) {
    return this._lines.get(index);
  } else {
    return this._lines[index];
  }
};

LinesCollection.prototype.length = function() {
  if ((typeof this._lines.length) == "function") {
    return this._lines.length();
  } else {
    return this._lines.length;
  }
};

LinesCollection.prototype.slice = function(start, end) {
  // can be unimplemented if removeLines's return value not needed
  if(this._lines.slice) {
    return this._lines.slice(start, end);
  } else {
    return [];
  }
};

LinesCollection.prototype.applySplice = function(s) {
  return this._lines.splice.apply(this._lines, s);
};

// debug
LinesCollection.prototype.toSource = function() {
  return this._lines.toSource();
};

/**
 * This class allows to iterate and modify texts which have several lines
 * It is used for applying Changesets on arrays of lines
 * Note from prev docs: "lines" need not be an array as long as it supports certain calls (lines_foo inside).
 */
function TextLinesMutator(lines) {
  if(!(this instanceof TextLinesMutator)) {
    return new TextLinesMutator(lines);
  }

  this._lines = new LinesCollection(lines);
  // Mutates lines, an array of strings, in place.
  // Mutation operations have the same constraints as exports operations
  // with respect to newlines, but not the other additional constraints
  // (i.e. ins/del ordering, forbidden no-ops, non-mergeability, final newline).
  // Can be used to mutate lists of strings where the last char of each string
  // is not actually a newline, but for the purposes of N and L values,
  // the caller should pretend it is, and for things to work right in that case, the input
  // to insert() should be a single line with no newlines.
  this._curSplice = [0, 0];
  this._inSplice = false;
  // position in document after curSplice is applied:
  this._curLine = 0;
  this._curCol = 0;
  // invariant: if (inSplice) then (curLine is in curSplice[0] + curSplice.length - {2,3}) &&
  //            curLine >= curSplice[0]
  // invariant: if (inSplice && (curLine >= curSplice[0] + curSplice.length - 2)) then
  //            curCol == 0
}
exports.textLinesMutator = TextLinesMutator;

TextLinesMutator.prototype._enterSplice = function() {
  this._curSplice[0] = this._curLine;
  this._curSplice[1] = 0;
  if (this._curCol > 0) {
      this._putCurLineInSplice();
  }
  this._inSplice = true;
}

TextLinesMutator.prototype._leaveSplice = function() {
  this._lines.applySplice(this._curSplice);
  this._curSplice = [0, 0];
  this._inSplice = false;
}

TextLinesMutator.prototype._isCurLineInSplice = function() {
  return (this._curLine - this._curSplice[0] < (this._curSplice.length - 2));
}

TextLinesMutator.prototype._putCurLineInSplice = function() {
  if (!this._isCurLineInSplice()) {
    this._curSplice.push(this._lines.get(this._curSplice[0] + this._curSplice[1]));
    this._curSplice[1]++;
  }
  return 2 + this._curLine - this._curSplice[0];
}

TextLinesMutator.prototype.skipLines = function(L, includeInSplice) {
  if (L) {
    if (includeInSplice) {
      if (!this._inSplice) {
        this._enterSplice();
      }
      for (var i = 0; i < L; i++) {
        this._curCol = 0;
        this._putCurLineInSplice();
        this._curLine++;
      }
    } else {
      if (this._inSplice) {
        if (L > 1) {
          this._leaveSplice();
        } else {
          this._putCurLineInSplice();
        }
      }
      this._curLine += L;
      this._curCol = 0;
    }
  }
}

TextLinesMutator.prototype.skip = function(N, L, includeInSplice) {
  if (N) {
    if (L) {
      this.skipLines(L, includeInSplice);
    } else {
      if (includeInSplice && !this._inSplice) {
        this._enterSplice();
      }
      if (this._inSplice) {
        this._putCurLineInSplice();
      }
      this._curCol += N;
    }
  }
}

TextLinesMutator.prototype._nextKLinesText = function(k) {
  var m = this._curSplice[0] + this._curSplice[1];
  return this._lines.slice(m, m + k).join('');
}

TextLinesMutator.prototype.removeLines = function(L) {
  var removed = '';
  if (L) {
    if (!this._inSplice) {
      this._enterSplice();
    }

    if (this._isCurLineInSplice()) {
      if (this._curCol == 0) {
        removed = this._curSplice.pop();
        removed += this._nextKLinesText(L - 1);
        this._curSplice[1] += L - 1;
      } else {
        removed = this._nextKLinesText(L - 1);
        this._curSplice[1] += L - 1;
        var sline = this._curSplice.length - 1;
        removed = this._curSplice[sline].substring(this._curCol) + removed;
        this._curSplice[sline] = this._curSplice[sline].substring(0, this._curCol) + this._lines.get(this._curSplice[0] + this._curSplice[1]);
        this._curSplice[1] += 1;
      }
    } else {
      removed = this._nextKLinesText(L);
      this._curSplice[1] += L;
    }
  }
  return removed;
}

TextLinesMutator.prototype.remove = function(N, L) {
  var removed = '';
  if (N) {
    if (L) {
      return this.removeLines(L);
    } else {
      if (!this._inSplice) {
        this._enterSplice();
      }
      var sline = this._putCurLineInSplice();
      removed = this._curSplice[sline].substring(this._curCol, this._curCol + N);
      this._curSplice[sline] = this._curSplice[sline].substring(0, this._curCol) + this._curSplice[sline].substring(this._curCol + N);
    }
  }
  return removed;
}

TextLinesMutator.prototype.insert = function(text, L) {
  if (text) {
    if (!this._inSplice) {
      this._enterSplice();
    }
    if (L) {
      var newLines = exports.splitTextLines(text);
      if (this._isCurLineInSplice()) {
        var sline = this._curSplice.length - 1;
        var theLine = this._curSplice[sline];
        var lineCol = this._curCol;
        this._curSplice[sline] = theLine.substring(0, lineCol) + newLines[0];
        this._curLine++;
        newLines.shift();
        Array.prototype.push.apply(this._curSplice, newLines);
        this._curLine += newLines.length;
        this._curSplice.push(theLine.substring(lineCol));
        this._curCol = 0;
      } else {
        Array.prototype.push.apply(this._curSplice, newLines);
        this._curLine += newLines.length;
      }
    } else {
      var sline = this._putCurLineInSplice();
      var theLine = this._curSplice[sline];
      this._curSplice[sline] = theLine.substring(0, this._curCol) + text + theLine.substring(this._curCol);
      this._curCol += text.length;
    }
  }
}

TextLinesMutator.prototype.hasMore = function() {
  var docLines = this._lines.length();
  if (this._inSplice) {
    docLines += this._curSplice.length - 2 - this._curSplice[1];
  }
  return this._curLine < docLines;
}

TextLinesMutator.prototype.close = function() {
  this._inSplice && this._leaveSplice();
}

/**
 * Function allowing iterating over two Op strings. 
 * @params in1 {string} first Op string
 * @params idx1 {int} integer where 1st iterator should start
 * @params in2 {string} second Op string
 * @params idx2 {int} integer where 2nd iterator should start
 * @params func {function} which decides how 1st or 2nd iterator 
 *         advances. When opX.opcode = 0, iterator X advances to
 *         next element
 *         func has signature f(op1, op2, opOut)
 *             op1 - current operation of the first iterator
 *             op2 - current operation of the second iterator
 *             opOut - result operator to be put into Changeset
 * @return {string} the integrated changeset
 */
exports.applyZip = function (in1, idx1, in2, idx2, func) {
  var iter1 = exports.opIterator(in1, idx1);
  var iter2 = exports.opIterator(in2, idx2);
  var assem = exports.smartOpAssembler();
  var op1 = exports.newOp();
  var op2 = exports.newOp();
  var opOut = exports.newOp();
  while (op1.opcode || iter1.hasNext() || op2.opcode || iter2.hasNext()) {
    if ((!op1.opcode) && iter1.hasNext()) iter1.next(op1);
    if ((!op2.opcode) && iter2.hasNext()) iter2.next(op2);
    func(op1, op2, opOut);
    if (opOut.opcode) {
      assem.append(opOut);
      opOut.opcode = '';
    }
  }
  assem.endDocument();
  return assem.toString();
};

/**
 * Unpacks a string encoded Changeset into a proper Changeset object
 * @params cs {string} String encoded Changeset
 * @returns {Changeset} a Changeset class
 */
exports.unpack = function (cs) {
  var headerRegex = /Z:([0-9a-z]+)([><])([0-9a-z]+)|/;
  var headerMatch = headerRegex.exec(cs);
  if ((!headerMatch) || (!headerMatch[0])) {
    exports.error("Not a exports: " + cs);
  }
  var oldLen = exports.parseNum(headerMatch[1]);
  var changeSign = (headerMatch[2] == '>') ? 1 : -1;
  var changeMag = exports.parseNum(headerMatch[3]);
  var newLen = oldLen + changeSign * changeMag;
  var opsStart = headerMatch[0].length;
  var opsEnd = cs.indexOf("$");
  if (opsEnd < 0) opsEnd = cs.length;
  return {
    oldLen: oldLen,
    newLen: newLen,
    ops: cs.substring(opsStart, opsEnd),
    charBank: cs.substring(opsEnd + 1)
  };
};

/**
 * Packs Changeset object into a string 
 * @params oldLen {int} Old length of the Changeset
 * @params newLen {int] New length of the Changeset
 * @params opsStr {string} String encoding of the changes to be made
 * @params bank {string} Charbank of the Changeset
 * @returns {Changeset} a Changeset class
 */
exports.pack = function (oldLen, newLen, opsStr, bank) {
  var lenDiff = newLen - oldLen;
  var lenDiffStr = (lenDiff >= 0 ? '>' + exports.numToString(lenDiff) : '<' + exports.numToString(-lenDiff));
  return 'Z:' + exports.numToString(oldLen) + lenDiffStr + opsStr + '$' + bank;
};

/**
 * Applies a Changeset to a string
 * @params cs {string} String encoded Changeset
 * @params str {string} String to which a Changeset should be applied
 */
exports.applyToText = function (cs, str) {
  var unpacked = exports.unpack(cs);
  exports.assert(str.length == unpacked.oldLen, "mismatched apply: ", str.length, " / ", unpacked.oldLen);
  var csIter = exports.opIterator(unpacked.ops);
  var bankIter = exports.stringIterator(unpacked.charBank);
  var strIter = exports.stringIterator(str);
  var assem = exports.stringAssembler();
  while (csIter.hasNext()) {
    var op = csIter.next();
    switch (op.opcode) {
    case '+':
      assem.append(bankIter.take(op.chars));
      break;
    case '-':
      strIter.skip(op.chars);
      break;
    case '=':
      assem.append(strIter.take(op.chars));
      break;
    }
  }
  assem.append(strIter.take(strIter.remaining()));
  return assem.toString();
};

/**
 * applies a changeset on an array of lines
 * @param CS {Changeset} the changeset to be applied
 * @param lines The lines to which the changeset needs to be applied
 */
exports.mutateTextLines = function (cs, lines) {
  var unpacked = exports.unpack(cs);
  var csIter = exports.opIterator(unpacked.ops);
  var bankIter = exports.stringIterator(unpacked.charBank);
  var mut = exports.textLinesMutator(lines);
  while (csIter.hasNext()) {
    var op = csIter.next();
    switch (op.opcode) {
    case '+':
      mut.insert(bankIter.take(op.chars), op.lines);
      break;
    case '-':
      mut.remove(op.chars, op.lines);
      break;
    case '=':
      mut.skip(op.chars, op.lines, ( !! op.attribs));
      break;
    }
  }
  mut.close();
};

/**
 * Composes two attribute strings (see below) into one.
 * @param att1 {string} first attribute string
 * @param att2 {string} second attribue string
 * @param resultIsMutaton {boolean} 
 * @param pool {AttribPool} attribute pool 
 */
exports.composeAttributes = function (att1, att2, resultIsMutation, pool) {
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
  if ((!att1) && resultIsMutation) {
    // In the case of a mutation (i.e. composing two exportss),
    // an att2 composed with an empy att1 is just att2.  If att1
    // is part of an attribution string, then att2 may remove
    // attributes that are already gone, so don't do this optimization.
    return att2;
  }
  if (!att2) {
    return att1;
  }

  var atts = [];
  exports.eachAttribNumber(att1, function(n) {
    atts.push(pool.getAttrib(n));
  });

  exports.eachAttribNumber(att2, function(n) {
    var pair = pool.getAttrib(n);
    var found = false;
    for (var j = 0; j < atts.length; j++) {
      var oldPair = atts[j];
      if (oldPair[0] == pair[0]) {
        if (pair[1] || resultIsMutation) {
          oldPair[1] = pair[1];
        } else {
          atts.splice(j, 1);
        }
        found = true;
        break;
      }
    }
    if ((!found) && (pair[1] || resultIsMutation)) {
      atts.push(pair);
    }
  });

  atts.sort();
  var s = '';
  for (var i = 0; i < atts.length; i++) {
    s += '*' + exports.numToString(pool.putAttrib(atts[i]));
  }
  return s;
};

/**
 * Function used as parameter for applyZip to apply a Changeset to an 
 * attribute 
 */
exports._slicerZipperFunc = function (attOp, csOp, opOut, pool) {
  // attOp is the op from the sequence that is being operated on, either an
  // attribution string or the earlier of two exportss being composed.
  // pool can be null if definitely not needed.
  if (attOp.opcode == '-') {
    exports.copyOp(attOp, opOut);
    attOp.opcode = '';
  } else if (!attOp.opcode) {
    exports.copyOp(csOp, opOut);
    csOp.opcode = '';
  } else {
    switch (csOp.opcode) {
    case '-':
      {
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
          if (!attOp.chars) {
            attOp.opcode = '';
          }
        } else {
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
    case '+':
      {
        // insert
        exports.copyOp(csOp, opOut);
        csOp.opcode = '';
        break;
      }
    case '=':
      {
        if (csOp.chars <= attOp.chars) {
          // keep or keep part
          opOut.opcode = attOp.opcode;
          opOut.chars = csOp.chars;
          opOut.lines = csOp.lines;
          opOut.attribs = exports.composeAttributes(attOp.attribs, csOp.attribs, attOp.opcode == '=', pool);
          csOp.opcode = '';
          attOp.chars -= csOp.chars;
          attOp.lines -= csOp.lines;
          if (!attOp.chars) {
            attOp.opcode = '';
          }
        } else {
          // keep and keep going
          opOut.opcode = attOp.opcode;
          opOut.chars = attOp.chars;
          opOut.lines = attOp.lines;
          opOut.attribs = exports.composeAttributes(attOp.attribs, csOp.attribs, attOp.opcode == '=', pool);
          attOp.opcode = '';
          csOp.chars -= attOp.chars;
          csOp.lines -= attOp.lines;
        }
        break;
      }
    case '':
      {
        exports.copyOp(attOp, opOut);
        attOp.opcode = '';
        break;
      }
    }
  }
};

/**
 * Applies a Changeset to the attribs string of a AText.
 * @param cs {string} Changeset
 * @param astr {string} the attribs string of a AText
 * @param pool {AttribsPool} the attibutes pool
 */
exports.applyToAttribution = function (cs, astr, pool) {
  var unpacked = exports.unpack(cs);

  return exports.applyZip(astr, 0, unpacked.ops, 0, function (op1, op2, opOut) {
    return exports._slicerZipperFunc(op1, op2, opOut, pool);
  });
};

exports.mutateAttributionLines = function (cs, lines, pool) {
  var unpacked = exports.unpack(cs);
  var csIter = exports.opIterator(unpacked.ops);
  var csBank = unpacked.charBank;
  var csBankIndex = 0;
  // treat the attribution lines as text lines, mutating a line at a time
  var mut = exports.textLinesMutator(lines);

  var lineIter = null;

  function isNextMutOp() {
    return (lineIter && lineIter.hasNext()) || mut.hasMore();
  }

  function nextMutOp(destOp) {
    if ((!(lineIter && lineIter.hasNext())) && mut.hasMore()) {
      var line = mut.removeLines(1);
      lineIter = exports.opIterator(line);
    }
    if (lineIter && lineIter.hasNext()) {
      lineIter.next(destOp);
    } else {
      destOp.opcode = '';
    }
  }
  var lineAssem = null;

  function outputMutOp(op) {
    if (!lineAssem) {
      lineAssem = exports.mergingOpAssembler();
    }
    lineAssem.append(op);
    if (op.lines > 0) {
      exports.assert(op.lines == 1, "Can't have op.lines of ", op.lines, " in attribution lines");
      // ship it to the mut
      mut.insert(lineAssem.toString(), 1);
      lineAssem = null;
    }
  }

  var csOp = exports.newOp();
  var attOp = exports.newOp();
  var opOut = exports.newOp();
  while (csOp.opcode || csIter.hasNext() || attOp.opcode || isNextMutOp()) {
    if ((!csOp.opcode) && csIter.hasNext()) {
      csIter.next(csOp);
    }
    if ((!csOp.opcode) && (!attOp.opcode) && (!lineAssem) && (!(lineIter && lineIter.hasNext()))) {
      break; // done
    } else if (csOp.opcode == '=' && csOp.lines > 0 && (!csOp.attribs) && (!attOp.opcode) && (!lineAssem) && (!(lineIter && lineIter.hasNext()))) {
      // skip multiple lines; this is what makes small changes not order of the document size
      mut.skipLines(csOp.lines);
      csOp.opcode = '';
    } else if (csOp.opcode == '+') {
      if (csOp.lines > 1) {
        var firstLineLen = csBank.indexOf('\n', csBankIndex) + 1 - csBankIndex;
        exports.copyOp(csOp, opOut);
        csOp.chars -= firstLineLen;
        csOp.lines--;
        opOut.lines = 1;
        opOut.chars = firstLineLen;
      } else {
        exports.copyOp(csOp, opOut);
        csOp.opcode = '';
      }
      outputMutOp(opOut);
      csBankIndex += opOut.chars;
      opOut.opcode = '';
    } else {
      if ((!attOp.opcode) && isNextMutOp()) {
        nextMutOp(attOp);
      }
      exports._slicerZipperFunc(attOp, csOp, opOut, pool);
      if (opOut.opcode) {
        outputMutOp(opOut);
        opOut.opcode = '';
      }
    }
  }

  exports.assert(!lineAssem, "line assembler not finished");
  mut.close();
};

/**
 * joins several Attribution lines
 * @param theAlines collection of Attribution lines
 * @returns {string} joined Attribution lines
 */
exports.joinAttributionLines = function (theAlines) {
  var assem = exports.mergingOpAssembler();
  for (var i = 0; i < theAlines.length; i++) {
    var aline = theAlines[i];
    var iter = exports.opIterator(aline);
    while (iter.hasNext()) {
      assem.append(iter.next());
    }
  }
  return assem.toString();
};

exports.splitAttributionLines = function (attrOps, text) {
  var iter = exports.opIterator(attrOps);
  var assem = exports.mergingOpAssembler();
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
      var newlineEnd = text.indexOf('\n', pos) + 1;
      exports.assert(newlineEnd > 0, "newlineEnd <= 0 in splitAttributionLines");
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

/**
 * splits text into lines
 * @param {string} text to be splitted
 */
exports.splitTextLines = function (text) {
  return text.match(/[^\n]*(?:\n|[^\n]$)/g);
};

/**
 * compose two Changesets
 * @param cs1 {Changeset} first Changeset
 * @param cs2 {Changeset} second Changeset
 * @param pool {AtribsPool} Attribs pool
 */
exports.compose = function (cs1, cs2, pool) {
  var unpacked1 = exports.unpack(cs1);
  var unpacked2 = exports.unpack(cs2);
  var len1 = unpacked1.oldLen;
  var len2 = unpacked1.newLen;
  exports.assert(len2 == unpacked2.oldLen, "mismatched composition of two changesets");
  var len3 = unpacked2.newLen;
  var bankIter1 = exports.stringIterator(unpacked1.charBank);
  var bankIter2 = exports.stringIterator(unpacked2.charBank);
  var bankAssem = exports.stringAssembler();

  var newOps = exports.applyZip(unpacked1.ops, 0, unpacked2.ops, 0, function (op1, op2, opOut) {
    var op1code = op1.opcode;
    var op2code = op2.opcode;
    if (op1code == '+' && op2code == '-') {
      bankIter1.skip(Math.min(op1.chars, op2.chars));
    }
    exports._slicerZipperFunc(op1, op2, opOut, pool);
    if (opOut.opcode == '+') {
      if (op2code == '+') {
        bankAssem.append(bankIter2.take(opOut.chars));
      } else {
        bankAssem.append(bankIter1.take(opOut.chars));
      }
    }
  });

  return exports.pack(len1, len3, newOps, bankAssem.toString());
};

/**
 * returns a function that tests if a string of attributes
 * (e.g. *3*4) contains a given attribute key,value that
 * is already present in the pool.
 * @param attribPair array [key,value] of the attribute 
 * @param pool {AttribPool} Attribute pool
 */
exports.attributeTester = function (attribPair, pool) {
  if (!pool) {
    return never;
  }
  var attribNum = pool.putAttrib(attribPair, true);
  if (attribNum < 0) {
    return never;
  } else {
    var re = new RegExp('\\*' + exports.numToString(attribNum) + '(?!\\w)');
    return function (attribs) {
      return re.test(attribs);
    };
  }

  function never(attribs) {
    return false;
  }
};

/**
 * creates the identity Changeset of length N
 * @param N {int} length of the identity changeset
 */
exports.identity = function (N) {
  return exports.pack(N, N, "", "");
};


/**
 * creates a Changeset which works on oldFullText and removes text 
 * from spliceStart to spliceStart+numRemoved and inserts newText 
 * instead. Also gives possibility to add attributes optNewTextAPairs 
 * for the new text.
 * @param oldFullText {string} old text
 * @param spliecStart {int} where splicing starts
 * @param numRemoved {int} number of characters to be removed
 * @param newText {string} string to be inserted
 * @param optNewTextAPairs {string} new pairs to be inserted
 * @param pool {AttribPool} Attribution Pool
 */
exports.makeSplice = function (oldFullText, spliceStart, numRemoved, newText, optNewTextAPairs, pool) {
  var oldLen = oldFullText.length;

  if (spliceStart >= oldLen) {
    spliceStart = oldLen - 1;
  }
  if (numRemoved > oldFullText.length - spliceStart - 1) {
    numRemoved = oldFullText.length - spliceStart - 1;
  }
  var oldText = oldFullText.substring(spliceStart, spliceStart + numRemoved);
  var newLen = oldLen + newText.length - oldText.length;

  var assem = exports.smartOpAssembler();
  assem.appendOpWithText('=', oldFullText.substring(0, spliceStart));
  assem.appendOpWithText('-', oldText);
  assem.appendOpWithText('+', newText, optNewTextAPairs, pool);
  assem.endDocument();
  return exports.pack(oldLen, newLen, assem.toString(), newText);
};

/**
 * Transforms a changeset into a list of splices in the form
 * [startChar, endChar, newText] meaning replace text from
 * startChar to endChar with newText
 * @param cs Changeset
 */
exports.toSplices = function (cs) {
  var unpacked = exports.unpack(cs);
  var splices = [];

  var oldPos = 0;
  var iter = exports.opIterator(unpacked.ops);
  var charIter = exports.stringIterator(unpacked.charBank);
  var inSplice = false;
  while (iter.hasNext()) {
    var op = iter.next();
    if (op.opcode == '=') {
      oldPos += op.chars;
      inSplice = false;
    } else {
      if (!inSplice) {
        splices.push([oldPos, oldPos, ""]);
        inSplice = true;
      }
      if (op.opcode == '-') {
        oldPos += op.chars;
        splices[splices.length - 1][1] += op.chars;
      } else if (op.opcode == '+') {
        splices[splices.length - 1][2] += charIter.take(op.chars);
      }
    }
  }

  return splices;
};

/**
 * 
 */
exports.characterRangeFollow = function (cs, startChar, endChar, insertionsAfter) {
  var newStartChar = startChar;
  var newEndChar = endChar;
  var splices = exports.toSplices(cs);
  var lengthChangeSoFar = 0;
  for (var i = 0; i < splices.length; i++) {
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
      } else {
        newStartChar = newEndChar = spliceStart + newTextLength;
      }
    } else if (spliceEnd <= newStartChar) {
      // splice is before range
      newStartChar += thisLengthChange;
      newEndChar += thisLengthChange;
    } else if (spliceStart >= newEndChar) {
      // splice is after range
    } else if (spliceStart >= newStartChar && spliceEnd <= newEndChar) {
      // splice is inside range
      newEndChar += thisLengthChange;
    } else if (spliceEnd < newEndChar) {
      // splice overlaps beginning of range
      newStartChar = spliceStart + newTextLength;
      newEndChar += thisLengthChange;
    } else {
      // splice overlaps end of range
      newEndChar = spliceStart;
    }

    lengthChangeSoFar += thisLengthChange;
  }

  return [newStartChar, newEndChar];
};

/**
 * Iterate over attributes in a changeset and move them from
 * oldPool to newPool
 * @param cs {Changeset} Chageset/attribution string to be iterated over
 * @param oldPool {AttribPool} old attributes pool
 * @param newPool {AttribPool} new attributes pool
 * @return {string} the new Changeset
 */
exports.moveOpsToNewPool = function (cs, oldPool, newPool) {
  return exports.mapAttribNumbers(cs, function(n) {
    var pair = oldPool.getAttrib(n);
    if(!pair) {
      exports.error('Can\'t copy unknown attrib (reference attrib string to non-existant pool entry). Inconsistent attrib state!');
    }
    return newPool.putAttrib(pair);
  });
};

/**
 * create an attribution inserting a text
 * @param text {string} text to be inserted
 */
exports.makeAttribution = function (text) {
  var assem = exports.smartOpAssembler();
  assem.appendOpWithText('+', text);
  return assem.toString();
};

/**
 * Iterates over attributes in exports, attribution string, or attribs property of an op
 * and runs function func on them
 * @param cs {Changeset} changeset
 * @param func {function} function to be called
 */ 
exports.eachAttribNumber = function (cs, func) {
  var upToDollar;
  var dollarPos = cs.indexOf('$');
  if (dollarPos < 0) {
    upToDollar = cs;
  } else {
    upToDollar = cs.substring(0, dollarPos);
  }

  var matches = upToDollar.match(/\*([0-9a-z]+)/g);
  for(var i = 0, n = matches && matches.length; i < n; i++) {
    var a = matches[i].substr(1);
    func(exports.parseNum(a));
  }
};

/**
 * Filter attributes which should remain in a Changeset
 * callable on a exports, attribution string, or attribs property of an op,
 * though it may easily create adjacent ops that can be merged.
 * @param cs {Changeset} changeset to be filtered
 * @param filter {function} fnc which returns true if an 
 *        attribute X (int) should be kept in the Changeset
 */ 
exports.filterAttribNumbers = function (cs, filter) {
  return exports.mapAttribNumbers(cs, filter);
};

/**
 * does exactly the same as exports.filterAttribNumbers 
 */ 
exports.mapAttribNumbers = function (cs, func) {
  var upToDollar;
  var fromDollar;
  var dollarPos = cs.indexOf('$');
  if (dollarPos < 0) {
    upToDollar = cs;
    fromDollar = "";
  } else {
    upToDollar = cs.substring(0, dollarPos);
    fromDollar = cs.substring(dollarPos);
  }

  return upToDollar.replace(/\*([0-9a-z]+)/g, function (s, a) {
      var n = func(exports.parseNum(a));
      if (n === true) {
        return s;
      } else if ((typeof n) === "number") {
        return '*' + exports.numToString(n);
      } else {
        return '';
      }
    }) + fromDollar;
};

/**
 * Create a Changeset going from Identity to a certain state
 * @params text {string} text of the final change
 * @attribs attribs {string} optional, operations which insert 
 *    the text and also puts the right attributes
 */
exports.makeAText = function (text, attribs) {
  return {
    text: text,
    attribs: (attribs || exports.makeAttribution(text))
  };
};

/**
 * Apply a Changeset to a AText 
 * @param cs {Changeset} Changeset to be applied
 * @param atext {AText} 
 * @param pool {AttribPool} Attribute Pool to add to
 */
exports.applyToAText = function (cs, atext, pool) {
  return {
    text: exports.applyToText(cs, atext.text),
    attribs: exports.applyToAttribution(cs, atext.attribs, pool)
  };
};

/**
 * Clones a AText structure
 * @param atext {AText} 
 */
exports.cloneAText = function (atext) {
  return {
    text: atext.text,
    attribs: atext.attribs
  };
};

/**
 * Copies a AText structure from atext1 to atext2
 * @param atext {AText} 
 */
exports.copyAText = function (atext1, atext2) {
  atext2.text = atext1.text;
  atext2.attribs = atext1.attribs;
};

/**
 * Append the set of operations from atext to an assembler
 * @param atext {AText} 
 * @param assem Assembler like smartOpAssembler
 */
exports.appendATextToAssembler = function (atext, assem) {
  // intentionally skips last newline char of atext
  var iter = exports.opIterator(atext.attribs);
  var op = exports.newOp();
  while (iter.hasNext()) {
    iter.next(op);
    if (!iter.hasNext()) {
      // last op, exclude final newline
      if (op.lines <= 1) {
        op.lines = 0;
        op.chars--;
        if (op.chars) {
          assem.append(op);
        }
      } else {
        var nextToLastNewlineEnd =
        atext.text.lastIndexOf('\n', atext.text.length - 2) + 1;
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
    } else {
      assem.append(op);
    }
  }
};

/**
 * Creates a clone of a Changeset and it's APool
 * @param cs {Changeset} 
 * @param pool {AtributePool}
 */
exports.prepareForWire = function (cs, pool) {
  var newPool = new AttributePool();
  var newCs = exports.moveOpsToNewPool(cs, pool, newPool);
  return {
    translated: newCs,
    pool: newPool
  };
};

/**
 * Checks if a changeset s the identity changeset
 */
exports.isIdentity = function (cs) {
  var unpacked = exports.unpack(cs);
  return unpacked.ops == "" && unpacked.oldLen == unpacked.newLen;
};

/**
 * returns the value of attribute with a certain key if it exists in the Op attribs string
 * @param attribs {string} Attribute string of a Op
 * @param key {string} string to be seached for
 * @param pool {AttribPool} attribute pool
 */
exports.opAttributeValue = function (op, key, pool) {
  return exports.attribsAttributeValue(op.attribs, key, pool);
};

/**
 * returns the value of attribute with a certain key if it exists in the attribs string
 * @param attribs {string} Attribute string
 * @param key {string} string to be seached for
 * @param pool {AttribPool} attribute pool
 */
exports.attribsAttributeValue = function (attribs, key, pool) {
  var value = '';
  if (attribs) {
    exports.eachAttribNumber(attribs, function (n) {
      var pair = pool.getAttrib(n);
      if(pair[0] == key) {
        value = pair[1];
      }
    });
  }
  return value;
};

/**
 * Creates a Changeset builder for a string with initial 
 * length oldLen. Allows to add/remove parts of it
 * @param oldLen {int} Old length
 */
function Builder(oldLen) {
  if(!(this instanceof Builder)) {
    return new Builder(oldLen);
  }

  this._assem = exports.smartOpAssembler();
  this._o = exports.newOp();
  this._charBank = exports.stringAssembler();
  this._oldLen = oldLen;
}
exports.builder = Builder;

// attribs are [[key1,value1],[key2,value2],...] or '*0*1...' (no pool needed in latter case)
Builder.prototype.keep = function (N, L, attribs, pool) {
  var o = this._o;

  o.opcode = '=';
  o.attribs = (attribs && exports.makeAttribsString('=', attribs, pool)) || '';
  o.chars = N;
  o.lines = (L || 0);
  this._assem.append(o);
  return this;
}

Builder.prototype.keepText = function (text, attribs, pool) {
  this._assem.appendOpWithText('=', text, attribs, pool);
  return this;
}

Builder.prototype.insert = function (text, attribs, pool) {
  this._assem.appendOpWithText('+', text, attribs, pool);
  this._charBank.append(text);
  return this;
}

Builder.prototype.remove = function (N, L) {
  var o = this._o;

  o.opcode = '-';
  o.attribs = '';
  o.chars = N;
  o.lines = (L || 0);
  this._assem.append(o);
  return this;
}

Builder.prototype.toString = function () {
  this._assem.endDocument();
  var newLen = this._oldLen + this._assem.getLengthChange();
  return exports.pack(this._oldLen, newLen, this._assem.toString(), this._charBank.toString());
}

exports.makeAttribsString = function (opcode, attribs, pool) {
  // makeAttribsString(opcode, '*3') or makeAttribsString(opcode, [['foo','bar']], myPool) work
  if (!attribs) {
    return '';
  } else if ((typeof attribs) == "string") {
    return attribs;
  } else if (pool && attribs && attribs.length) {
    if (attribs.length > 1) {
      attribs = attribs.slice();
      attribs.sort();
    }
    var result = '';
    for (var i = 0; i < attribs.length; i++) {
      var pair = attribs[i];
      if (opcode == '=' || (opcode == '+')) {// && pair[1])) { //allow empty attrs
        result += '*' + exports.numToString(pool.putAttrib(pair));
      }
    }
    return result;
  }
};

// like "substring" but on a single-line attribution string
exports.subattribution = function (astr, start, optEnd) {
  var iter = exports.opIterator(astr, 0);
  var assem = exports.smartOpAssembler();
  var attOp = exports.newOp();
  var csOp = exports.newOp();
  var opOut = exports.newOp();

  function doCsOp() {
    if (csOp.chars) {
      while (csOp.opcode && (attOp.opcode || iter.hasNext())) {
        if (!attOp.opcode) iter.next(attOp);

        if (csOp.opcode && attOp.opcode && csOp.chars >= attOp.chars && attOp.lines > 0 && csOp.lines <= 0) {
          csOp.lines++;
        }

        exports._slicerZipperFunc(attOp, csOp, opOut, null);
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
  } else {
    csOp.opcode = '=';
    csOp.chars = optEnd - start;
    doCsOp();
  }

  return assem.toString();
};

exports.inverse = function (cs, lines, alines, pool) {
  // lines and alines are what the exports is meant to apply to.
  // They may be arrays or objects with .get(i) and .length methods.
  // They include final newlines on lines.

  function lines_get(idx) {
    if (lines.get) {
      return lines.get(idx);
    } else {
      return lines[idx];
    }
  }

  function alines_get(idx) {
    if (alines.get) {
      return alines.get(idx);
    } else {
      return alines[idx];
    }
  }

  var curLine = 0;
  var curChar = 0;
  var curLineOpIter = null;
  var curLineOpIterLine;
  var curLineNextOp = exports.newOp('+');

  var unpacked = exports.unpack(cs);
  var csIter = exports.opIterator(unpacked.ops);
  var builder = exports.builder(unpacked.newLen);

  function consumeAttribRuns(numChars, func /*(len, attribs, endsLine)*/ ) {

    if ((!curLineOpIter) || (curLineOpIterLine != curLine)) {
      // create curLineOpIter and advance it to curChar
      curLineOpIter = exports.opIterator(alines_get(curLine));
      curLineOpIterLine = curLine;
      var indexIntoLine = 0;
      var done = false;
      while (!done && curLineOpIter.hasNext()) {
        curLineOpIter.next(curLineNextOp);
        if (indexIntoLine + curLineNextOp.chars >= curChar) {
          curLineNextOp.chars -= (curChar - indexIntoLine);
          done = true;
        } else {
          indexIntoLine += curLineNextOp.chars;
        }
      }
    }

    while (numChars > 0) {
      if ((!curLineNextOp.chars) && (!curLineOpIter.hasNext())) {
        curLine++;
        curChar = 0;
        curLineOpIterLine = curLine;
        curLineNextOp.chars = 0;
        curLineOpIter = exports.opIterator(alines_get(curLine));
      }
      if (!curLineNextOp.chars) {
        curLineOpIter.next(curLineNextOp);
      }
      var charsToUse = Math.min(numChars, curLineNextOp.chars);
      func(charsToUse, curLineNextOp.attribs, charsToUse == curLineNextOp.chars && curLineNextOp.lines > 0);
      numChars -= charsToUse;
      curLineNextOp.chars -= charsToUse;
      curChar += charsToUse;
    }

    if ((!curLineNextOp.chars) && (!curLineOpIter.hasNext())) {
      curLine++;
      curChar = 0;
    }
  }

  function skip(N, L) {
    if (L) {
      curLine += L;
      curChar = 0;
    } else {
      if (curLineOpIter && curLineOpIterLine == curLine) {
        consumeAttribRuns(N, function () {});
      } else {
        curChar += N;
      }
    }
  }

  function nextText(numChars) {
    var len = 0;
    var assem = exports.stringAssembler();
    var firstString = lines_get(curLine).substring(curChar);
    len += firstString.length;
    assem.append(firstString);

    var lineNum = curLine + 1;
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
    return function (s) {
      if (!cache[s]) {
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
        exports.eachAttribNumber(csOp.attribs, function (n) {
          var pair = pool.getAttrib(n);
          attribKeys.push(pair[0]);
          attribValues.push(pair[1]);
        });
        var undoBackToAttribs = cachedStrFunc(function (attribs) {
          var backAttribs = [];
          for (var i = 0; i < attribKeys.length; i++) {
            var appliedKey = attribKeys[i];
            var appliedValue = attribValues[i];
            var oldValue = exports.attribsAttributeValue(attribs, appliedKey, pool);
            if (appliedValue != oldValue) {
              backAttribs.push([appliedKey, oldValue]);
            }
          }
          return exports.makeAttribsString('=', backAttribs, pool);
        });
        consumeAttribRuns(csOp.chars, function (len, attribs, endsLine) {
          builder.keep(len, endsLine ? 1 : 0, undoBackToAttribs(attribs));
        });
      } else {
        skip(csOp.chars, csOp.lines);
        builder.keep(csOp.chars, csOp.lines);
      }
    } else if (csOp.opcode == '+') {
      builder.remove(csOp.chars, csOp.lines);
    } else if (csOp.opcode == '-') {
      var textBank = nextText(csOp.chars);
      var textBankIndex = 0;
      consumeAttribRuns(csOp.chars, function (len, attribs, endsLine) {
        builder.insert(textBank.substr(textBankIndex, len), attribs);
        textBankIndex += len;
      });
    }
  }

  return exports.checkRep(builder.toString());
};

// %CLIENT FILE ENDS HERE%
exports.follow = function (cs1, cs2, reverseInsertOrder, pool) {
  var unpacked1 = exports.unpack(cs1);
  var unpacked2 = exports.unpack(cs2);
  var len1 = unpacked1.oldLen;
  var len2 = unpacked2.oldLen;
  exports.assert(len1 == len2, "mismatched follow - cannot transform cs1 on top of cs2");
  var chars1 = exports.stringIterator(unpacked1.charBank);
  var chars2 = exports.stringIterator(unpacked2.charBank);

  var oldLen = unpacked1.newLen;
  var oldPos = 0;
  var newLen = 0;

  var hasInsertFirst = exports.attributeTester(['insertorder', 'first'], pool);

  var newOps = exports.applyZip(unpacked1.ops, 0, unpacked2.ops, 0, function (op1, op2, opOut) {
    if (op1.opcode == '+' || op2.opcode == '+') {
      var whichToDo;
      if (op2.opcode != '+') {
        whichToDo = 1;
      } else if (op1.opcode != '+') {
        whichToDo = 2;
      } else {
        // both +
        var firstChar1 = chars1.peek(1);
        var firstChar2 = chars2.peek(1);
        var insertFirst1 = hasInsertFirst(op1.attribs);
        var insertFirst2 = hasInsertFirst(op2.attribs);
        if (insertFirst1 && !insertFirst2) {
          whichToDo = 1;
        } else if (insertFirst2 && !insertFirst1) {
          whichToDo = 2;
        }
        // insert string that doesn't start with a newline first so as not to break up lines
        else if (firstChar1 == '\n' && firstChar2 != '\n') {
          whichToDo = 2;
        } else if (firstChar1 != '\n' && firstChar2 == '\n') {
          whichToDo = 1;
        }
        // break symmetry:
        else if (reverseInsertOrder) {
          whichToDo = 2;
        } else {
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
      } else {
        // whichToDo == 2
        chars2.skip(op2.chars);
        exports.copyOp(op2, opOut);
        op2.opcode = '';
      }
    } else if (op1.opcode == '-') {
      if (!op2.opcode) {
        op1.opcode = '';
      } else {
        if (op1.chars <= op2.chars) {
          op2.chars -= op1.chars;
          op2.lines -= op1.lines;
          op1.opcode = '';
          if (!op2.chars) {
            op2.opcode = '';
          }
        } else {
          op1.chars -= op2.chars;
          op1.lines -= op2.lines;
          op2.opcode = '';
        }
      }
    } else if (op2.opcode == '-') {
      exports.copyOp(op2, opOut);
      if (!op1.opcode) {
        op2.opcode = '';
      } else if (op2.chars <= op1.chars) {
        // delete part or all of a keep
        op1.chars -= op2.chars;
        op1.lines -= op2.lines;
        op2.opcode = '';
        if (!op1.chars) {
          op1.opcode = '';
        }
      } else {
        // delete all of a keep, and keep going
        opOut.lines = op1.lines;
        opOut.chars = op1.chars;
        op2.lines -= op1.lines;
        op2.chars -= op1.chars;
        op1.opcode = '';
      }
    } else if (!op1.opcode) {
      exports.copyOp(op2, opOut);
      op2.opcode = '';
    } else if (!op2.opcode) {
      // @NOTE: Critical bugfix for EPL issue #1625. We do not copy op1 here
      // in order to prevent attributes from leaking into result changesets.
      // exports.copyOp(op1, opOut);
      op1.opcode = '';
    } else {
      // both keeps
      opOut.opcode = '=';
      opOut.attribs = exports.followAttributes(op1.attribs, op2.attribs, pool);
      if (op1.chars <= op2.chars) {
        opOut.chars = op1.chars;
        opOut.lines = op1.lines;
        op2.chars -= op1.chars;
        op2.lines -= op1.lines;
        op1.opcode = '';
        if (!op2.chars) {
          op2.opcode = '';
        }
      } else {
        opOut.chars = op2.chars;
        opOut.lines = op2.lines;
        op1.chars -= op2.chars;
        op1.lines -= op2.lines;
        op2.opcode = '';
      }
    }
    switch (opOut.opcode) {
    case '=':
      oldPos += opOut.chars;
      newLen += opOut.chars;
      break;
    case '-':
      oldPos += opOut.chars;
      break;
    case '+':
      newLen += opOut.chars;
      break;
    }
  });
  newLen += oldLen - oldPos;

  return exports.pack(oldLen, newLen, newOps, unpacked2.charBank);
};

exports.followAttributes = function (att1, att2, pool) {
  // The merge of two sets of attribute changes to the same text
  // takes the lexically-earlier value if there are two values
  // for the same key.  Otherwise, all key/value changes from
  // both attribute sets are taken.  This operation is the "follow",
  // so a set of changes is produced that can be applied to att1
  // to produce the merged set.
  if ((!att2) || (!pool)) {
    return '';
  }
  if (!att1) {
    return att2;
  }

  var atts = [];
  exports.eachAttribNumber(att2, function(n) {
    atts.push(pool.getAttrib(n));
  });
  exports.eachAttribNumber(att1, function(n) {
    var pair1 = pool.getAttrib(n);
    for (var i = 0; i < atts.length; i++) {
      var pair2 = atts[i];
      if (pair1[0] == pair2[0]) {
        if (pair1[1] <= pair2[1]) {
          // winner of merge is pair1, delete this attribute
          atts.splice(i, 1);
        }
        break;
      }
    }
  });
  // we've only removed attributes, so they're already sorted
  var s = '';
  for (var i = 0; i < atts.length; i++) {
    s += '*' + exports.numToString(pool.putAttrib(atts[i]));
  }
  return s;
};

exports.composeWithDeletions = function (cs1, cs2, pool) {
  var unpacked1 = exports.unpack(cs1);
  var unpacked2 = exports.unpack(cs2);
  var len1 = unpacked1.oldLen;
  var len2 = unpacked1.newLen;
  exports.assert(len2 == unpacked2.oldLen, "mismatched composition of two changesets");
  var len3 = unpacked2.newLen;
  var bankIter1 = exports.stringIterator(unpacked1.charBank);
  var bankIter2 = exports.stringIterator(unpacked2.charBank);
  var bankAssem = exports.stringAssembler();

  var newOps = exports.applyZip(unpacked1.ops, 0, unpacked2.ops, 0, function (op1, op2, opOut) {
    var op1code = op1.opcode;
    var op2code = op2.opcode;
    if (op1code == '+' && op2code == '-') {
      bankIter1.skip(Math.min(op1.chars, op2.chars));
    }
    exports._slicerZipperFuncWithDeletions(op1, op2, opOut, pool);
    if (opOut.opcode == '+') {
      if (op2code == '+') {
        bankAssem.append(bankIter2.take(opOut.chars));
      } else {
        bankAssem.append(bankIter1.take(opOut.chars));
      }
    }
  });

  return exports.pack(len1, len3, newOps, bankAssem.toString());
};

// This function is 95% like _slicerZipperFunc, we just changed two lines to ensure it merges the attribs of deletions properly.
// This is necassary for correct paddiff. But to ensure these changes doesn't affect anything else, we've created a seperate function only used for paddiffs
exports._slicerZipperFuncWithDeletions= function (attOp, csOp, opOut, pool) {
  // attOp is the op from the sequence that is being operated on, either an
  // attribution string or the earlier of two exportss being composed.
  // pool can be null if definitely not needed.
  if (attOp.opcode == '-') {
    exports.copyOp(attOp, opOut);
    attOp.opcode = '';
  } else if (!attOp.opcode) {
    exports.copyOp(csOp, opOut);
    csOp.opcode = '';
  } else {
    switch (csOp.opcode) {
      case '-':
      {
        if (csOp.chars <= attOp.chars) {
          // delete or delete part
          if (attOp.opcode == '=') {
            opOut.opcode = '-';
            opOut.chars = csOp.chars;
            opOut.lines = csOp.lines;
            opOut.attribs = csOp.attribs; //changed by yammer
          }
          attOp.chars -= csOp.chars;
          attOp.lines -= csOp.lines;
          csOp.opcode = '';
          if (!attOp.chars) {
            attOp.opcode = '';
          }
        } else {
          // delete and keep going
          if (attOp.opcode == '=') {
            opOut.opcode = '-';
            opOut.chars = attOp.chars;
            opOut.lines = attOp.lines;
            opOut.attribs = csOp.attribs; //changed by yammer
          }
          csOp.chars -= attOp.chars;
          csOp.lines -= attOp.lines;
          attOp.opcode = '';
        }
        break;
      }
      case '+':
      {
        // insert
        exports.copyOp(csOp, opOut);
        csOp.opcode = '';
        break;
      }
      case '=':
      {
        if (csOp.chars <= attOp.chars) {
          // keep or keep part
          opOut.opcode = attOp.opcode;
          opOut.chars = csOp.chars;
          opOut.lines = csOp.lines;
          opOut.attribs = exports.composeAttributes(attOp.attribs, csOp.attribs, attOp.opcode == '=', pool);
          csOp.opcode = '';
          attOp.chars -= csOp.chars;
          attOp.lines -= csOp.lines;
          if (!attOp.chars) {
            attOp.opcode = '';
          }
        } else {
          // keep and keep going
          opOut.opcode = attOp.opcode;
          opOut.chars = attOp.chars;
          opOut.lines = attOp.lines;
          opOut.attribs = exports.composeAttributes(attOp.attribs, csOp.attribs, attOp.opcode == '=', pool);
          attOp.opcode = '';
          csOp.chars -= attOp.chars;
          csOp.lines -= attOp.lines;
        }
        break;
      }
      case '':
      {
        exports.copyOp(attOp, opOut);
        attOp.opcode = '';
        break;
      }
    }
  }
};