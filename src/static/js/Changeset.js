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
/*
 * @typedef {Object} op
 * @property {string} opcode
 * @property {number} chars
 * @property {number} lines
 * @property {string} attribs
 *
 * @typedef {Object} AttribPool
 * @property {Array<number | number>} numToAttrib
 * @property {function} attribToNum
 * @property {Array<number | string>} getAttrib
 * @property {numberf} putAttrib
 * @property {number} nextNum
 *
 * @typedef {Object} UnpackedCS
 * @property {Number} oldLen
 * @property {Number} newLen
 * @property {String} ops
 * @property {String} charBank
 *
 * @typedef {Object} OpAssembler
 * @property {Function} append
 * @property {Function} toString
 * @property {Function} clear
 * @property {Function} endDocument
 * @property {Function} appendOpWithText
 * @property {Function} getLengthChange
 */

var AttributePool = require("./AttributePool");

/**
 * ==================== General Util Functions =======================
 */

/**
 * This method is called whenever there is an error in the sync process
 * @param {String} msg Just some message
 */
exports.error = function error(msg) {
  var e = new Error(msg);
  e.easysync = true;
  throw e;
};

/**
 * This method is used for assertions with Messages 
 * if assert fails, the error function is called.
 * @param {Boolean} b assertion condition
 * @param {String} msgParts error to be passed if it fails
 */
exports.assert = function assert(b, msgParts) {
  if (!b) {
    var msg = Array.prototype.slice.call(arguments, 1).join('');
    exports.error("Failed assertion: " + msg);
  }
};

/**
 * Parses a number from string base 36
 * @param {String} str string of the number in base 36
 * @returns {Number} number in base 10
 */
exports.parseNum = function (str) {
  return parseInt(str, 36);
};

/**
 * Writes a number in base 36 and puts it in a string
 * @param {number} num number
 * @returns {String} string
 */
exports.numToString = function (num) {
  return num.toString(36).toLowerCase();
};

/**
 * Converts stuff before $ to base 10
 * @obsolete not really used anywhere??
 * @param {String} cs the string
 * @return {string}
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
 * @param {String} cs String representation of the Changeset
 * @return {number}
 */ 
exports.oldLen = function (cs) {
  return exports.unpack(cs).oldLen;
};

/**
 * returns the length of the text after changeset is applied
 * @param {String} cs String representation of the Changeset
 * @return {number} 
 */ 
exports.newLen = function (cs) {
  return exports.unpack(cs).newLen;
};

/**
 * This function creates an iterator which decodes string changeset operations
 * @param {string} opsStr String encoding of the change operations to be performed 
 * @param {number|undefined} optStartIndex  from where in the string should the iterator start 
 * @return {{next:function;hasNext:function;lastIndex:function}} type object iterator 
 */
exports.opIterator = function (opsStr, optStartIndex) {
  //print(opsStr);
  var regex = /((?:\*[0-9a-z]+)*)(?:\|([0-9a-z]+))?([-+=])([0-9a-z]+)|\?|/g;
  var startIndex = (optStartIndex || 0);
  var curIndex = startIndex;
  var prevIndex = curIndex;

  /*
   * Applies the regex to opsStr at curIndex
   *
   * @return {Array} result of applying regular expression
   */
  function nextRegexMatch() {
    prevIndex = curIndex;
    var result;
    regex.lastIndex = curIndex;
    result = regex.exec(opsStr);
    curIndex = regex.lastIndex;
    if (result[0] == '?') {
      exports.error("Hit error opcode in op stream");
    }

    return result;
  }
  var regexResult = nextRegexMatch();
  var obj = exports.newOp();

  function next(optObj) {
    var op = (optObj || obj);
    if (regexResult[0]) {
      op.attribs = regexResult[1];
      op.lines = exports.parseNum(regexResult[2] || 0);
      op.opcode = regexResult[3];
      op.chars = exports.parseNum(regexResult[4]);
      regexResult = nextRegexMatch();
    } else {
      exports.clearOp(op);
    }
    return op;
  }

  function hasNext() {
    return !!(regexResult[0]);
  }

  function lastIndex() {
    return prevIndex;
  }
  return {
    next: next,
    hasNext: hasNext,
    lastIndex: lastIndex
  };
};

/**
 * Cleans an Op object
 * @param {op} op object to be cleared
 * @return {undefined}
 */
exports.clearOp = function (op) {
  op.opcode = '';
  op.chars = 0;
  op.lines = 0;
  op.attribs = '';
};

/**
 * Creates a new Op object
 * @param {string|undefined} optOpcode the type operation of the Op object
 * TODO(doc) find out how to [-,+,=]
 * @return {object}
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
 * @param {op} op to be cloned
 * @return {object}
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
 * @param {op} op1 src Op
 * @param {op} op2 dest Op
 * @return {undefined}
 */
exports.copyOp = function (op1, op2) {
  op2.opcode = op1.opcode;
  op2.chars = op1.chars;
  op2.lines = op1.lines;
  op2.attribs = op1.attribs;
};

exports.opString = function (op) {
  // just for debugging
  if (!op.opcode) return 'null';
  var assem = exports.opAssembler();
  assem.append(op);
  return assem.toString();
};

/**
 * Used just for debugging
 * @param {string} str
 * @return {string}
 */
exports.stringOp = function (str) {
  // just for debugging
  return exports.opIterator(str).next();
};

/**
 * Used to check if a Changeset is valid
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
      exports.assert(oldPos <= oldLen, oldPos, " > ", oldLen, " in ", cs);
      break;
    case '+':
      {
        calcNewLen += o.chars;
        numInserted += o.chars;
        exports.assert(calcNewLen <= newLen, calcNewLen, " > ", newLen, " in ", cs);
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
  exports.assert(normalized == cs, 'Invalid changeset (checkRep failed)');

  return cs;
}


/**
 * ==================== Util Functions =======================
 */

/**
 * creates an object that allows you to append operations (type Op) and also
 * compresses them if possible
 * @return {OpAssembler}
 */
exports.smartOpAssembler = function () {
  // Like opAssembler but able to produce conforming exportss
  // from slightly looser input, at the cost of speed.
  // Specifically:
  // - merges consecutive operations that can be merged
  // - strips final "="
  // - ignores 0-length changes
  // - reorders consecutive + and - (which margingOpAssembler doesn't do)
  var minusAssem = exports.mergingOpAssembler();
  var plusAssem = exports.mergingOpAssembler();
  var keepAssem = exports.mergingOpAssembler();
  var assem = exports.stringAssembler();
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

  /**
   * @param {op} op
   * @return {undefined}
   */
  function append(op) {
    if (!op.opcode) return;
    if (!op.chars) return;

    if (op.opcode == '-') {
      if (lastOpcode == '=') {
        flushKeeps();
      }
      minusAssem.append(op);
      lengthChange -= op.chars;
    } else if (op.opcode == '+') {
      if (lastOpcode == '=') {
        flushKeeps();
      }
      plusAssem.append(op);
      lengthChange += op.chars;
    } else if (op.opcode == '=') {
      if (lastOpcode != '=') {
        flushPlusMinus();
      }
      keepAssem.append(op);
    }
    lastOpcode = op.opcode;
  }

  /**
   * @param {string} opcode
   * @param {string} text
   * @param {string|undefined} attribs
   * @param {AttribPool|undefined} pool
   * @return {undefined}
   */
  function appendOpWithText(opcode, text, attribs, pool) {
    var op = exports.newOp(opcode);
    op.attribs = exports.makeAttribsString(opcode, attribs, pool);
    var lastNewlinePos = text.lastIndexOf('\n');
    if (lastNewlinePos < 0) {
      op.chars = text.length;
      op.lines = 0;
      append(op);
    } else {
      op.chars = lastNewlinePos + 1;
      op.lines = text.match(/\n/g).length;
      append(op);
      op.chars = text.length - (lastNewlinePos + 1);
      op.lines = 0;
      append(op);
    }
  }

  /*
   * @return {string}
   */
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

  /*
   * @return {number}
   */
  function getLengthChange() {
    return lengthChange;
  }

  return {
    append: append,
    toString: toString,
    clear: clear,
    endDocument: endDocument,
    appendOpWithText: appendOpWithText,
    getLengthChange: getLengthChange
  };
};


/*
 * @return {object}
 */
exports.mergingOpAssembler = function () {
  // This assembler can be used in production; it efficiently
  // merges consecutive operations that are mergeable, ignores
  // no-ops, and drops final pure "keeps".  It does not re-order
  // operations.
  var assem = exports.opAssembler();
  var bufOp = exports.newOp();

  // If we get, for example, insertions [xxx\n,yyy], those don't merge,
  // but if we get [xxx\n,yyy,zzz\n], that merges to [xxx\nyyyzzz\n].
  // This variable stores the length of yyy and any other newline-less
  // ops immediately after it.
  var bufOpAdditionalCharsAfterNewline = 0;

  /**
   * @param {boolean|undefined} isEndDocument
   * @return {undefined}
   */
  function flush(isEndDocument) {
    if (bufOp.opcode) {
      if (isEndDocument && bufOp.opcode == '=' && !bufOp.attribs) {
        // final merged keep, leave it implicit
      } else {
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

  /*
   * @param {op} op
   */
  function append(op) {
    if (op.chars > 0) {
      if (bufOp.opcode == op.opcode && bufOp.attribs == op.attribs) {
        if (op.lines > 0) {
          // bufOp and additional chars are all mergeable into a multi-line op
          bufOp.chars += bufOpAdditionalCharsAfterNewline + op.chars;
          bufOp.lines += op.lines;
          bufOpAdditionalCharsAfterNewline = 0;
        } else if (bufOp.lines == 0) {
          // both bufOp and op are in-line
          bufOp.chars += op.chars;
        } else {
          // append in-line text to multi-line bufOp
          bufOpAdditionalCharsAfterNewline += op.chars;
        }
      } else {
        flush();
        exports.copyOp(op, bufOp);
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
    exports.clearOp(bufOp);
  }
  return {
    append: append,
    toString: toString,
    clear: clear,
    endDocument: endDocument
  };
};



/*
 * @return {Object}
 */
exports.opAssembler = function () {
  var pieces = [];
  // this function allows op to be mutated later (doesn't keep a ref)

  /**
   * @param {op} op
   * @return {undefined}
   */
  function append(op) {
    pieces.push(op.attribs);
    if (op.lines) {
      pieces.push('|', exports.numToString(op.lines));
    }
    pieces.push(op.opcode);
    pieces.push(exports.numToString(op.chars));
  }

  function toString() {
    return pieces.join('');
  }

  function clear() {
    pieces.length = 0;
  }
  return {
    append: append,
    toString: toString,
    clear: clear
  };
};

/**
 * A custom made String Iterator
 * @param {string} str String to be iterated over
 * @return {number}
 */
exports.stringIterator = function (str) {
  var curIndex = 0;
  // newLines is the number of \n between curIndex and str.length
  var newLines = str.split("\n").length - 1
  function getnewLines(){
    return newLines
  }

  /**
   * @param {number} n
   */
  function assertRemaining(n) {
    exports.assert(n <= remaining(), "!(", n, " <= ", remaining(), ")");
  }

  /**
   * @param {number} n
   */
  function take(n) {
    assertRemaining(n);
    var s = str.substr(curIndex, n);
    newLines -= s.split("\n").length - 1
    curIndex += n;
    return s;
  }

  /**
   * @param {number} n
   * @return {string}
   */
  function peek(n) {
    assertRemaining(n);
    var s = str.substr(curIndex, n);
    return s;
  }

  /**
   * @param {number} n
   */
  function skip(n) {
    assertRemaining(n);
    curIndex += n;
  }

  /*
   * @return {number}
   */
  function remaining() {
    return str.length - curIndex;
  }
  return {
    take: take,
    skip: skip,
    remaining: remaining,
    peek: peek,
    newlines: getnewLines
  };
};

/**
 * A custom made StringBuffer 
 * @return {object}
 */
exports.stringAssembler = function () {
  var pieces = [];

  function append(x) {
    pieces.push(String(x));
  }

  /*
   * @return {string}
   */
  function toString() {
    return pieces.join('');
  }
  return {
    append: append,
    toString: toString
  };
};

/**
 * This class allows to iterate and modify texts which have several lines
 * It is used for applying Changesets on arrays of lines
 * Note from prev docs: "lines" need not be an array as long as it supports certain calls (lines_foo inside).
 * @param {Array<string>} lines
 * @return {undefined}
 */
exports.textLinesMutator = function (lines) {
  // Mutates lines, an array of strings, in place.
  // Mutation operations have the same constraints as exports operations
  // with respect to newlines, but not the other additional constraints
  // (i.e. ins/del ordering, forbidden no-ops, non-mergeability, final newline).
  // Can be used to mutate lists of strings where the last char of each string
  // is not actually a newline, but for the purposes of N and L values,
  // the caller should pretend it is, and for things to work right in that case, the input
  // to insert() should be a single line with no newlines.
  var curSplice = [0, 0];
  var inSplice = false;
  // position in document after curSplice is applied:
  var curLine = 0,
      curCol = 0;
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
    } else {
      return lines[idx];
    }
  }
  // can be unimplemented if removeLines's return value not needed

  function lines_slice(start, end) {
    if (lines.slice) {
      return lines.slice(start, end);
    } else {
      return [];
    }
  }

  function lines_length() {
    if ((typeof lines.length) == "number") {
      return lines.length;
    } else {
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
    print(typ + ": " + curSplice.toSource() + " / " + curLine + "," + curCol + " / " + lines_toSource());
  }

  function putCurLineInSplice() {
    if (!isCurLineInSplice()) {
      curSplice.push(lines_get(curSplice[0] + curSplice[1]));
      curSplice[1]++;
    }
    return 2 + curLine - curSplice[0];
  }

  function skipLines(L, includeInSplice) {
    if (L) {
      if (includeInSplice) {
        if (!inSplice) {
          enterSplice();
        }
        for (var i = 0; i < L; i++) {
          curCol = 0;
          putCurLineInSplice();
          curLine++;
        }
      } else {
        if (inSplice) {
          if (L > 1) {
            leaveSplice();
          } else {
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
}*/
      // tests case foo in remove(), which isn't otherwise covered in current impl
    }
    //debugPrint("skip");
  }

  function skip(N, L, includeInSplice) {
    if (N) {
      if (L) {
        skipLines(L, includeInSplice);
      } else {
        if (includeInSplice && !inSplice) {
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
      if (!inSplice) {
        enterSplice();
      }

      function nextKLinesText(k) {
        var m = curSplice[0] + curSplice[1];
        return lines_slice(m, m + k).join('');
      }
      if (isCurLineInSplice()) {
        //print(curCol);
        if (curCol == 0) {
          removed = curSplice[curSplice.length - 1];
          // print("FOO"); // case foo
          curSplice.length--;
          removed += nextKLinesText(L - 1);
          curSplice[1] += L - 1;
        } else {
          removed = nextKLinesText(L - 1);
          curSplice[1] += L - 1;
          var sline = curSplice.length - 1;
          removed = curSplice[sline].substring(curCol) + removed;
          curSplice[sline] = curSplice[sline].substring(0, curCol) + lines_get(curSplice[0] + curSplice[1]);
          curSplice[1] += 1;
        }
      } else {
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
      } else {
        if (!inSplice) {
          enterSplice();
        }
        var sline = putCurLineInSplice();
        removed = curSplice[sline].substring(curCol, curCol + N);
        curSplice[sline] = curSplice[sline].substring(0, curCol) + curSplice[sline].substring(curCol + N);
        //debugPrint("remove");
      }
    }
    return removed;
  }

  function insert(text, L) {
    if (text) {
      if (!inSplice) {
        enterSplice();
      }
      if (L) {
        var newLines = exports.splitTextLines(text);
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
        } else {
          Array.prototype.push.apply(curSplice, newLines);
          curLine += newLines.length;
        }
      } else {
        var sline = putCurLineInSplice();
        curSplice[sline] = curSplice[sline].substring(0, curCol) + text + curSplice[sline].substring(curCol);
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

  var self = {
    skip: skip,
    remove: remove,
    insert: insert,
    close: close,
    hasMore: hasMore,
    removeLines: removeLines,
    skipLines: skipLines
  };
  return self;
};

/**
 * Function allowing iterating over two Op strings. 
 * @param {string} in1 first Op string
 * @param {number} idx1 integer where 1st iterator should start
 * @param {string} in2 second Op string
 * @param {number} idx2 integer where 2nd iterator should start
 * @param {function} func {function} which decides how 1st or 2nd iterator 
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
      //print(opOut.toSource());
      assem.append(opOut);
      opOut.opcode = '';
    }
  }
  assem.endDocument();
  return assem.toString();
};

/**
 * Unpacks a string encoded Changeset into a proper Changeset object
 * @param {string} cs String encoded Changeset
 * @return {UnpackedCS} a Changeset class
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
 * @param {number} oldLen Old length of the Changeset
 * @param {number} newLen New length of the Changeset
 * @param {string} opsStr String encoding of the changes to be made
 * @param {string} bank Charbank of the Changeset
 * @return {string} a Changeset class
 */
exports.pack = function (oldLen, newLen, opsStr, bank) {
  var lenDiff = newLen - oldLen;
  var lenDiffStr = (lenDiff >= 0 ? '>' + exports.numToString(lenDiff) : '<' + exports.numToString(-lenDiff));
  var a = [];
  a.push('Z:', exports.numToString(oldLen), lenDiffStr, opsStr, '$', bank);
  return a.join('');
};

/**
 * Applies a Changeset to a string
 * @param {string} cs String encoded Changeset
 * @param {string} str String to which a Changeset should be applied
 * @return {string}
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
      //op is + and op.lines 0: no newlines must be in op.chars
      //op is + and op.lines >0: op.chars must include op.lines newlines
      if(op.lines != bankIter.peek(op.chars).split("\n").length - 1){
        throw new Error("newline count is wrong in op +; cs:"+cs+" and text:"+str);
      }
      assem.append(bankIter.take(op.chars));
      break;
    case '-':
      //op is - and op.lines 0: no newlines must be in the deleted string
      //op is - and op.lines >0: op.lines newlines must be in the deleted string
      if(op.lines != strIter.peek(op.chars).split("\n").length - 1){
        throw new Error("newline count is wrong in op -; cs:"+cs+" and text:"+str);
      }
      strIter.skip(op.chars);
      break;
    case '=':
      //op is = and op.lines 0: no newlines must be in the copied string
      //op is = and op.lines >0: op.lines newlines must be in the copied string
      if(op.lines != strIter.peek(op.chars).split("\n").length - 1){
        throw new Error("newline count is wrong in op =; cs:"+cs+" and text:"+str);
      }
      assem.append(strIter.take(op.chars));
      break;
    }
  }
  assem.append(strIter.take(strIter.remaining()));
  return assem.toString();
};

/**
 * applies a changeset on an array of lines
 * @param {string} cs the changeset to be applied
 * @param {Array} lines The lines to which the changeset needs to be applied
 * @return {undefined}
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
 * @param {string} att1 first attribute string
 * @param {string} att2 second attribue string
 * @param {boolean} resultIsMutation
 * @param {AttribPool} pool attribute pool 
 * @return {string}
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
  if (!att2) return att1;
  var atts = [];
  att1.replace(/\*([0-9a-z]+)/g, function (_, a) {
    atts.push(pool.getAttrib(exports.parseNum(a)));
    return '';
  });
  att2.replace(/\*([0-9a-z]+)/g, function (_, a) {
    var pair = pool.getAttrib(exports.parseNum(a));
    var found = false;
    for (var i = 0; i < atts.length; i++) {
      var oldPair = atts[i];
      if (oldPair[0] == pair[0]) {
        if (pair[1] || resultIsMutation) {
          oldPair[1] = pair[1];
        } else {
          atts.splice(i, 1);
        }
        found = true;
        break;
      }
    }
    if ((!found) && (pair[1] || resultIsMutation)) {
      atts.push(pair);
    }
    return '';
  });
  atts.sort();
  var buf = exports.stringAssembler();
  for (var i = 0; i < atts.length; i++) {
    buf.append('*');
    buf.append(exports.numToString(pool.putAttrib(atts[i])));
  }
  //print(att1+" / "+att2+" / "+buf.toString());
  return buf.toString();
};

/**
 * Function used as parameter for applyZip to apply a Changeset to an 
 * attribute 
 * @param {op} attOp
 * @param {op} csOp
 * @param {op} opOut
 * @param {AttribPool|null} pool
 * @return {undefined}
 */
exports._slicerZipperFunc = function (attOp, csOp, opOut, pool) {
  // attOp is the op from the sequence that is being operated on, either an
  // attribution string or the earlier of two exportss being composed.
  // pool can be null if definitely not needed.
  //print(csOp.toSource()+" "+attOp.toSource()+" "+opOut.toSource());
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
 * @param {string} cs {string} Changeset
 * @param {string} astr {string} the attribs string of a AText
 * @param {AttribPool} pool {AttribsPool} the attibutes pool
 * @return {string}
 */
exports.applyToAttribution = function (cs, astr, pool) {
  var unpacked = exports.unpack(cs);

  return exports.applyZip(astr, 0, unpacked.ops, 0, function (op1, op2, opOut) {
    return exports._slicerZipperFunc(op1, op2, opOut, pool);
  });
};

/*exports.oneInsertedLineAtATimeOpIterator = function(opsStr, optStartIndex, charBank) {
  var iter = exports.opIterator(opsStr, optStartIndex);
  var bankIndex = 0;

};*/

/*
 * TODO
 * @param {string} cs TODO 
 * @param {Array<string>} lines TODO
 * @param {AttribPool} pool TODO
 * @return {undefined}
 */
exports.mutateAttributionLines = function (cs, lines, pool) {
  //dmesg(cs);
  //dmesg(lines.toSource()+" ->");
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

  /*
   * @param {op} op
   */
  function outputMutOp(op) {
    //print("outputMutOp: "+op.toSource());
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
    //print(csOp.toSource()+" "+attOp.toSource()+" "+opOut.toSource());
    //print(csOp.opcode+"/"+csOp.lines+"/"+csOp.attribs+"/"+lineAssem+"/"+lineIter+"/"+(lineIter?lineIter.hasNext():null));
    //print("csOp: "+csOp.toSource());
    if ((!csOp.opcode) && (!attOp.opcode) && (!lineAssem) && (!(lineIter && lineIter.hasNext()))) {
      break; // done
    } else if (csOp.opcode == '=' && csOp.lines > 0 && (!csOp.attribs) && (!attOp.opcode) && (!lineAssem) && (!(lineIter && lineIter.hasNext()))) {
      // skip multiple lines; this is what makes small changes not order of the document size
      mut.skipLines(csOp.lines);
      //print("skipped: "+csOp.lines);
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
      //print("attOp: "+attOp.toSource());
      exports._slicerZipperFunc(attOp, csOp, opOut, pool);
      if (opOut.opcode) {
        outputMutOp(opOut);
        opOut.opcode = '';
      }
    }
  }

  exports.assert(!lineAssem, "line assembler not finished:"+cs);
  mut.close();

  //dmesg("-> "+lines.toSource());
};

/**
 * joins several Attribution lines
 * @param {Array<string>} theAlines collection of Attribution lines
 * @return {string} joined Attribution lines
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

/**
  * Splits attribution operations so that every line in the text has its own attribution string
  * It needs text to find the position of newlines
  *
  * @param {string} attrOps The attribute string
  * @param {string} text content
  * @returns lines {Array<string>} one attribution string for every line
  */
}
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
 * @return {Array<string>}
 */
exports.splitTextLines = function (text) {
  return text.match(/[^\n]*(?:\n|[^\n]$)/g);
};

/**
 * compose two Changesets
 * @param {string} cs1 {string} first Changeset
 * @param {string} cs2 {string} second Changeset
 * @param {AttribPool} pool {AtribsPool} Attribs pool
 * @return {string}
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
    //var debugBuilder = exports.stringAssembler();
    //debugBuilder.append(exports.opString(op1));
    //debugBuilder.append(',');
    //debugBuilder.append(exports.opString(op2));
    //debugBuilder.append(' / ');
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

    //debugBuilder.append(exports.opString(op1));
    //debugBuilder.append(',');
    //debugBuilder.append(exports.opString(op2));
    //debugBuilder.append(' -> ');
    //debugBuilder.append(exports.opString(opOut));
    //print(debugBuilder.toString());
  });

  return exports.pack(len1, len3, newOps, bankAssem.toString());
};

/**
 * returns a function that tests if a string of attributes
 * (e.g. *3*4) contains a given attribute key,value that
 * is already present in the pool.
 * @param {Array<string,string>} attribPair array [key,value] of the attribute 
 * @param {AttribPool} pool Attribute pool
 * @return {boolean}
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
 * @param {number} N {int} length of the identity changeset
 * @return {string}
 */
exports.identity = function (N) {
  return exports.pack(N, N, "", "");
};


/**
 * creates a Changeset which works on oldFullText and removes text 
 * from spliceStart to spliceStart+numRemoved and inserts newText 
 * instead. Also gives possibility to add attributes optNewTextAPairs 
 * for the new text.
 * @param {string} oldFullText {string} old text
 * @param {number} spliceStart {int} where splicing starts
 * @param {number} numRemoved {int} number of characters to be removed
 * @param {string} newText {string} string to be inserted
 * @param {string} optNewTextAPairs {string} new pairs to be inserted
 * @param {AttribPool} pool {AttribPool} Attribution Pool
 * @return {string}
 */
exports.makeSplice = function (oldFullText, spliceStart, numRemoved, newText, optNewTextAPairs, pool) {
  var oldLen = oldFullText.length;

  if (spliceStart >= oldLen) {
    spliceStart = oldLen - 1;
  }
  if (numRemoved > oldFullText.length - spliceStart) {
    numRemoved = oldFullText.length - spliceStart;
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
 * @param {string} cs Changeset
 * @return {Array<number;number;string>}
 */
exports.toSplices = function (cs) {
  // 
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
 * @param {string} cs an changeset
 * @param {number} startChar begin
 * @param {number} endChar end
 * @param {boolean} insertionsAfter 
 * @return {Array<number,number>}
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
 * @param {string} cs {string} Chageset/attribution string to be iterated over
 * @param {AttribPool} oldPool {AttribPool} old attributes pool
 * @param {AttribPool} newPool {AttribPool} new attributes pool
 * @return {string} the new Changeset
 */
exports.moveOpsToNewPool = function (cs, oldPool, newPool) {
  // works on exports or attribution string
  var dollarPos = cs.indexOf('$');
  if (dollarPos < 0) {
    dollarPos = cs.length;
  }
  var upToDollar = cs.substring(0, dollarPos);
  var fromDollar = cs.substring(dollarPos);
  // order of attribs stays the same
  return upToDollar.replace(/\*([0-9a-z]+)/g, function (_, a) {
    var oldNum = exports.parseNum(a);
    var pair = oldPool.getAttrib(oldNum);
    if(!pair) exports.error('Can\'t copy unknown attrib (reference attrib string to non-existant pool entry). Inconsistent attrib state!');
    var newNum = newPool.putAttrib(pair);
    return '*' + exports.numToString(newNum);
  }) + fromDollar;
};

/**
 * create an attribution inserting a text
 * @param {string} text {string} text to be inserted
 * @return {string}
 */
exports.makeAttribution = function (text) {
  var assem = exports.smartOpAssembler();
  assem.appendOpWithText('+', text);
  return assem.toString();
};

/**
 * Iterates over attributes in exports, attribution string, or attribs property of an op
 * and runs function func on them
 * @param {string} cs {string} changeset
 * @param {function} func {function} function to be called
 * @return {string}
 */ 
exports.eachAttribNumber = function (cs, func) {
  var dollarPos = cs.indexOf('$');
  if (dollarPos < 0) {
    dollarPos = cs.length;
  }
  var upToDollar = cs.substring(0, dollarPos);

  upToDollar.replace(/\*([0-9a-z]+)/g, function (_, a) {
    func(exports.parseNum(a));
    return '';
  });
};

/**
 * Filter attributes which should remain in a Changeset
 * callable on a exports, attribution string, or attribs property of an op,
 * though it may easily create adjacent ops that can be merged.
 * @param {string} cs {string} changeset to be filtered
 * @param {function} filter {function} fnc which returns true if an 
 *        attribute X (int) should be kept in the Changeset
 * @return {string}
 */ 
exports.filterAttribNumbers = function (cs, filter) {
  return exports.mapAttribNumbers(cs, filter);
};

/**
 * does exactly the same as exports.filterAttribNumbers 
 * @param {string} cs TODO
 * @param {function} func TODO
 * @return {string}
 */ 
exports.mapAttribNumbers = function (cs, func) {
  var dollarPos = cs.indexOf('$');
  if (dollarPos < 0) {
    dollarPos = cs.length;
  }
  var upToDollar = cs.substring(0, dollarPos);

  var newUpToDollar = upToDollar.replace(/\*([0-9a-z]+)/g, function (s, a) {
    var n = func(exports.parseNum(a));
    if (n === true) {
      return s;
    } else if ((typeof n) === "number") {
      return '*' + exports.numToString(n);
    } else {
      return '';
    }
  });

  return newUpToDollar + cs.substring(dollarPos);
};

/**
 * Create a Changeset going from Identity to a certain state
 * @param {string} text text of the final change
 * @param {string} attribs attribs optional, operations which insert 
 *    the text and also puts the right attributes
 * @return {Object}
 */
exports.makeAText = function (text, attribs) {
  return {
    text: text,
    attribs: (attribs || exports.makeAttribution(text))
  };
};

/**
 * Apply a Changeset to a AText 
 * @param {string} cs {string} Changeset to be applied
 * @param {AText} atext {AText} 
 * @param {AttribPool} pool {AttribPool} Attribute Pool to add to
 * @return {{text: AText, attribs: string}}
 */
exports.applyToAText = function (cs, atext, pool) {
  return {
    text: exports.applyToText(cs, atext.text),
    attribs: exports.applyToAttribution(cs, atext.attribs, pool)
  }
};

/**
 * Clones a AText structure
 * @param {AText} atext {AText} 
 * @return {{text: AText, attribs: string}}
 */
exports.cloneAText = function (atext) {
  if (atext) {
    return {
      text: atext.text,
      attribs: atext.attribs
    }
  } else exports.error("atext is null");
};

/**
 * Copies a AText structure from atext1 to atext2
 * @param {AText} atext1
 * @param {AText} atext2
 * @return {undefined}
 */
exports.copyAText = function (atext1, atext2) {
  atext2.text = atext1.text;
  atext2.attribs = atext1.attribs;
};

/**
 * Append the set of operations from atext to an assembler
 * @param {AText} atext
 * @param {OpAssembler} assem Assembler like smartOpAssembler
 * @return {undefined}
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
 * @param {string} cs {string} 
 * @param {AttribPool} pool {AtributePool}
 * @return {Object}
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
 * @param {string} cs
 * @return {boolean}
 */
exports.isIdentity = function (cs) {
  var unpacked = exports.unpack(cs);
  return unpacked.ops == "" && unpacked.oldLen == unpacked.newLen;
};

/**
 * returns all the values of attributes with a certain key 
 * in an Op attribs string 
 * @param {op} op {string} Attribute string of a Op
 * @param {string} key {string} string to be seached for
 * @param {AttribPool} pool {AttribPool} attribute pool
 * @return {string} an attribs value
 */
exports.opAttributeValue = function (op, key, pool) {
  return exports.attribsAttributeValue(op.attribs, key, pool);
};

/**
 * returns all the values of attributes with a certain key 
 * in an attribs string 
 * @param {string} attribs Attribute string
 * @param {string} key string to be seached for
 * @param {AttribPool} pool attribute pool
 * @return {string} string
 */
exports.attribsAttributeValue = function (attribs, key, pool) {
  var value = '';
  if (attribs) {
    exports.eachAttribNumber(attribs, function (n) {
      if (pool.getAttribKey(n) == key) {
        value = pool.getAttribValue(n);
      }
    });
  }
  return value;
};

/**
 * Creates a Changeset builder for a string with initial 
 * length oldLen. Allows to add/remove parts of it
 * @param {number} oldLen Old length
 */
exports.builder = function (oldLen) {
  var assem = exports.smartOpAssembler();
  var o = exports.newOp();
  var charBank = exports.stringAssembler();

  var self = {
    // attribs are [[key1,value1],[key2,value2],...] or '*0*1...' (no pool needed in latter case)
    keep: function (N, L, attribs, pool) {
      o.opcode = '=';
      o.attribs = (attribs && exports.makeAttribsString('=', attribs, pool)) || '';
      o.chars = N;
      o.lines = (L || 0);
      assem.append(o);
      return self;
    },
    keepText: function (text, attribs, pool) {
      assem.appendOpWithText('=', text, attribs, pool);
      return self;
    },
    insert: function (text, attribs, pool) {
      assem.appendOpWithText('+', text, attribs, pool);
      charBank.append(text);
      return self;
    },
    remove: function (N, L) {
      o.opcode = '-';
      o.attribs = '';
      o.chars = N;
      o.lines = (L || 0);
      assem.append(o);
      return self;
    },
    toString: function () {
      assem.endDocument();
      var newLen = oldLen + assem.getLengthChange();
      return exports.pack(oldLen, newLen, assem.toString(), charBank.toString());
    }
  };

  return self;
};

/*
 * @param {string} opcode
 * @param {string} attribs
 * @param {AttribPool} pool
 * @return {string}
 */
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
    var result = [];
    for (var i = 0; i < attribs.length; i++) {
      var pair = attribs[i];
      if (opcode == '=' || (opcode == '+' && pair[1])) {
        result.push('*' + exports.numToString(pool.putAttrib(pair)));
      }
    }
    return result.join('');
  }
};

// like "substring" but on a single-line attribution string
/*
 * @param {string} astr
 * @param {number} start
 * @param {number} optEnd
 * @return {string}
 */
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

/*
 * @param {string} cs
 * @param {Array<string>} lines
 * @param {Array<string>} alines
 * @param {AttribPool} pool
 * @return {string}
 */
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
          attribKeys.push(pool.getAttribKey(n));
          attribValues.push(pool.getAttribValue(n));
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
/*
 * @param {string} cs1
 * @param {string} cs2
 * @param {boolean} reverseInsertOrder
 * @param {AttribPool} pool
 * @return {string}
 */
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

/*
 * @param {string} att1
 * @param {string} att2
 * @param {AttribPool} pool
 * @return {string}
 */
exports.followAttributes = function (att1, att2, pool) {
  // The merge of two sets of attribute changes to the same text
  // takes the lexically-earlier value if there are two values
  // for the same key.  Otherwise, all key/value changes from
  // both attribute sets are taken.  This operation is the "follow",
  // so a set of changes is produced that can be applied to att1
  // to produce the merged set.
  if ((!att2) || (!pool)) return '';
  if (!att1) return att2;
  var atts = [];
  att2.replace(/\*([0-9a-z]+)/g, function (_, a) {
    atts.push(pool.getAttrib(exports.parseNum(a)));
    return '';
  });
  att1.replace(/\*([0-9a-z]+)/g, function (_, a) {
    var pair1 = pool.getAttrib(exports.parseNum(a));
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
    return '';
  });
  // we've only removed attributes, so they're already sorted
  var buf = exports.stringAssembler();
  for (var i = 0; i < atts.length; i++) {
    buf.append('*');
    buf.append(exports.numToString(pool.putAttrib(atts[i])));
  }
  return buf.toString();
};

/*
 * @param {string} cs1
 * @param {string} cs2
 * @param {AttribPool} pool
 * @return {string}
 */
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

/* 
 * This function is 95% like _slicerZipperFunc, we just changed two lines to ensure it merges the attribs of deletions properly. 
 * This is necassary for correct paddiff. But to ensure these changes doesn't affect anything else, we've created a seperate function only used for paddiffs
 * @param {op} attOp
 * @param {op} csOp
 * @param {op} opOut
 * @param {AttribPool} pool
 * @return {undefined}
 */
exports._slicerZipperFuncWithDeletions= function (attOp, csOp, opOut, pool) {
  // attOp is the op from the sequence that is being operated on, either an
  // attribution string or the earlier of two exportss being composed.
  // pool can be null if definitely not needed.
  //print(csOp.toSource()+" "+attOp.toSource()+" "+opOut.toSource());
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
