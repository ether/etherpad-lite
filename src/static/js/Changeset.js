'use strict';
/*
 * This is the Changeset library copied from the old Etherpad with some
 * modifications to use it in node.js
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

const AttributePool = require('./AttributePool');

/**
 * ==================== General Util Functions =======================
 */

/**
 * This method is called whenever there is an error in the sync process
 * @param msg {string} Just some message
 */
exports.error = (msg) => {
  const e = new Error(msg);
  e.easysync = true;
  throw e;
};

/**
 * This method is used for assertions with Messages
 * if assert fails, the error function is called.
 * @param b {boolean} assertion condition
 * @param msgParts {string} error to be passed if it fails
 */
exports.assert = (b, msgParts) => {
  if (!b) {
    const msg = Array.prototype.slice.call(arguments, 1).join('');
    exports.error(`Failed assertion: ${msg}`);
  }
};

/**
 * Parses a number from string base 36
 * @param str {string} string of the number in base 36
 * @returns {int} number
 */
exports.parseNum = (str) => parseInt(str, 36);

/**
 * Writes a number in base 36 and puts it in a string
 * @param num {int} number
 * @returns {string} string
 */
exports.numToString = (num) => num.toString(36).toLowerCase();

/**
 * Converts stuff before $ to base 10
 * @obsolete not really used anywhere??
 * @param cs {string} the string
 * @return integer
 */
exports.toBaseTen = (cs) => {
  const dollarIndex = cs.indexOf('$');
  const beforeDollar = cs.substring(0, dollarIndex);
  const fromDollar = cs.substring(dollarIndex);
  return beforeDollar.replace(/[0-9a-z]+/g, (s) => String(exports.parseNum(s))) + fromDollar;
};


/**
 * ==================== Changeset Functions =======================
 */

/**
 * returns the required length of the text before changeset
 * can be applied
 * @param cs {string} String representation of the Changeset
 */
exports.oldLen = (cs) => exports.unpack(cs).oldLen;

/**
 * returns the length of the text after changeset is applied
 * @param cs {string} String representation of the Changeset
 */
exports.newLen = (cs) => exports.unpack(cs).newLen;

/**
 * this function creates an iterator which decodes string changeset operations
 * @param opsStr {string} String encoding of the change operations to be performed
 * @param optStartIndex {int} from where in the string should the iterator start
 * @return {Op} type object iterator
 */
exports.opIterator = (opsStr, optStartIndex) => {
  // print(opsStr);
  const regex = /((?:\*[0-9a-z]+)*)(?:\|([0-9a-z]+))?([-+=])([0-9a-z]+)|\?|/g;
  const startIndex = (optStartIndex || 0);
  let curIndex = startIndex;
  let prevIndex = curIndex;

  const nextRegexMatch = () => {
    prevIndex = curIndex;
    regex.lastIndex = curIndex;
    const result = regex.exec(opsStr);
    curIndex = regex.lastIndex;
    if (result[0] === '?') {
      exports.error('Hit error opcode in op stream');
    }

    return result;
  };
  let regexResult = nextRegexMatch();
  const obj = exports.newOp();

  const next = (optObj) => {
    const op = (optObj || obj);
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
  };

  const hasNext = () => !!(regexResult[0]);

  const lastIndex = () => prevIndex;

  return {
    next,
    hasNext,
    lastIndex,
  };
};

/**
 * Cleans an Op object
 * @param {Op} object to be cleared
 */
exports.clearOp = (op) => {
  op.opcode = '';
  op.chars = 0;
  op.lines = 0;
  op.attribs = '';
};

/**
 * Creates a new Op object
 * @param optOpcode the type operation of the Op object
 */
exports.newOp = (optOpcode) => ({
  opcode: (optOpcode || ''),
  chars: 0,
  lines: 0,
  attribs: '',
});

/**
 * Clones an Op
 * @param op Op to be cloned
 */
exports.cloneOp = (op) => ({
  opcode: op.opcode,
  chars: op.chars,
  lines: op.lines,
  attribs: op.attribs,
});

/**
 * Copies op1 to op2
 * @param op1 src Op
 * @param op2 dest Op
 */
exports.copyOp = (op1, op2) => {
  op2.opcode = op1.opcode;
  op2.chars = op1.chars;
  op2.lines = op1.lines;
  op2.attribs = op1.attribs;
};

/**
 * Writes the Op in a string the way that changesets need it
 */
exports.opString = (op) => {
  // just for debugging
  if (!op.opcode) return 'null';
  const assem = exports.opAssembler();
  assem.append(op);
  return assem.toString();
};

/**
 * Used just for debugging
 */
exports.stringOp = (str) => exports.opIterator(str).next();

/**
 * Used to check if a Changeset if valid
 * @param cs {Changeset} Changeset to be checked
 */
exports.checkRep = (cs) => {
  // doesn't check things that require access to attrib pool (e.g. attribute order)
  // or original string (e.g. newline positions)
  const unpacked = exports.unpack(cs);
  const oldLen = unpacked.oldLen;
  const newLen = unpacked.newLen;
  const ops = unpacked.ops;
  let charBank = unpacked.charBank;

  const assem = exports.smartOpAssembler();
  let oldPos = 0;
  let calcNewLen = 0;
  let numInserted = 0;
  const iter = exports.opIterator(ops);
  while (iter.hasNext()) {
    const o = iter.next();
    switch (o.opcode) {
      case '=':
        oldPos += o.chars;
        calcNewLen += o.chars;
        break;
      case '-':
        oldPos += o.chars;
        exports.assert(oldPos <= oldLen, oldPos, ' > ', oldLen, ' in ', cs);
        break;
      case '+':
      {
        calcNewLen += o.chars;
        numInserted += o.chars;
        exports.assert(calcNewLen <= newLen, calcNewLen, ' > ', newLen, ' in ', cs);
        break;
      }
    }
    assem.append(o);
  }

  calcNewLen += oldLen - oldPos;
  charBank = charBank.substring(0, numInserted);
  while (charBank.length < numInserted) {
    charBank += '?';
  }

  assem.endDocument();
  const normalized = exports.pack(oldLen, calcNewLen, assem.toString(), charBank);
  exports.assert(normalized === cs, 'Invalid changeset (checkRep failed)');

  return cs;
};


/**
 * ==================== Util Functions =======================
 */

/**
 * creates an object that allows you to append operations (type Op) and also
 * compresses them if possible
 */
exports.smartOpAssembler = () => {
  // Like opAssembler but able to produce conforming exportss
  // from slightly looser input, at the cost of speed.
  // Specifically:
  // - merges consecutive operations that can be merged
  // - strips final "="
  // - ignores 0-length changes
  // - reorders consecutive + and - (which margingOpAssembler doesn't do)
  const minusAssem = exports.mergingOpAssembler();
  const plusAssem = exports.mergingOpAssembler();
  const keepAssem = exports.mergingOpAssembler();
  const assem = exports.stringAssembler();
  let lastOpcode = '';
  let lengthChange = 0;

  const flushKeeps = () => {
    assem.append(keepAssem.toString());
    keepAssem.clear();
  };

  const flushPlusMinus = () => {
    assem.append(minusAssem.toString());
    minusAssem.clear();
    assem.append(plusAssem.toString());
    plusAssem.clear();
  };

  const append = (op) => {
    if (!op.opcode) return;
    if (!op.chars) return;

    if (op.opcode === '-') {
      if (lastOpcode === '=') {
        flushKeeps();
      }
      minusAssem.append(op);
      lengthChange -= op.chars;
    } else if (op.opcode === '+') {
      if (lastOpcode === '=') {
        flushKeeps();
      }
      plusAssem.append(op);
      lengthChange += op.chars;
    } else if (op.opcode === '=') {
      if (lastOpcode !== '=') {
        flushPlusMinus();
      }
      keepAssem.append(op);
    }
    lastOpcode = op.opcode;
  };

  const appendOpWithText = (opcode, text, attribs, pool) => {
    const op = exports.newOp(opcode);
    op.attribs = exports.makeAttribsString(opcode, attribs, pool);
    const lastNewlinePos = text.lastIndexOf('\n');
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
  };

  const toString = () => {
    flushPlusMinus();
    flushKeeps();
    return assem.toString();
  };

  const clear = () => {
    minusAssem.clear();
    plusAssem.clear();
    keepAssem.clear();
    assem.clear();
    lengthChange = 0;
  };

  const endDocument = () => {
    keepAssem.endDocument();
  };

  const getLengthChange = () => lengthChange;

  return {
    append,
    toString,
    clear,
    endDocument,
    appendOpWithText,
    getLengthChange,
  };
};


exports.mergingOpAssembler = () => {
  // This assembler can be used in production; it efficiently
  // merges consecutive operations that are mergeable, ignores
  // no-ops, and drops final pure "keeps".  It does not re-order
  // operations.
  const assem = exports.opAssembler();
  const bufOp = exports.newOp();

  // If we get, for example, insertions [xxx\n,yyy], those don't merge,
  // but if we get [xxx\n,yyy,zzz\n], that merges to [xxx\nyyyzzz\n].
  // This variable stores the length of yyy and any other newline-less
  // ops immediately after it.
  let bufOpAdditionalCharsAfterNewline = 0;

  const flush = (isEndDocument) => {
    if (bufOp.opcode) {
      if (isEndDocument && bufOp.opcode === '=' && !bufOp.attribs) {
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
  };

  const append = (op) => {
    if (op.chars > 0) {
      if (bufOp.opcode === op.opcode && bufOp.attribs === op.attribs) {
        if (op.lines > 0) {
          // bufOp and additional chars are all mergeable into a multi-line op
          bufOp.chars += bufOpAdditionalCharsAfterNewline + op.chars;
          bufOp.lines += op.lines;
          bufOpAdditionalCharsAfterNewline = 0;
        } else if (bufOp.lines === 0) {
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
  };

  const endDocument = () => {
    flush(true);
  };

  const toString = () => {
    flush();
    return assem.toString();
  };

  const clear = () => {
    assem.clear();
    exports.clearOp(bufOp);
  };

  return {
    append,
    toString,
    clear,
    endDocument,
  };
};


exports.opAssembler = () => {
  const pieces = [];
  // this function allows op to be mutated later (doesn't keep a ref)

  const append = (op) => {
    pieces.push(op.attribs);
    if (op.lines) {
      pieces.push('|', exports.numToString(op.lines));
    }
    pieces.push(op.opcode);
    pieces.push(exports.numToString(op.chars));
  };

  const toString = () => pieces.join('');

  const clear = () => {
    pieces.length = 0;
  };

  return {
    append,
    toString,
    clear,
  };
};

/**
 * A custom made String Iterator
 * @param str {string} String to be iterated over
 */
exports.stringIterator = (str) => {
  let curIndex = 0;
  // newLines is the number of \n between curIndex and str.length
  let newLines = str.split('\n').length - 1;
  const getnewLines = () => newLines;

  const assertRemaining = (n) => {
    exports.assert(n <= remaining(), '!(', n, ' <= ', remaining(), ')');
  };

  const take = (n) => {
    assertRemaining(n);
    const s = str.substr(curIndex, n);
    newLines -= s.split('\n').length - 1;
    curIndex += n;
    return s;
  };

  const peek = (n) => {
    assertRemaining(n);
    const s = str.substr(curIndex, n);
    return s;
  };

  const skip = (n) => {
    assertRemaining(n);
    curIndex += n;
  };

  const remaining = () => str.length - curIndex;

  return {
    take,
    skip,
    remaining,
    peek,
    newlines: getnewLines,
  };
};

/**
 * A custom made StringBuffer
 */
exports.stringAssembler = () => {
  const pieces = [];

  const append = (x) => {
    pieces.push(String(x));
  };

  const toString = () => pieces.join('');

  return {
    append,
    toString,
  };
};

/**
 * This class allows to iterate and modify texts which have several lines
 * It is used for applying Changesets on arrays of lines
 * Note from prev docs: "lines" need not be an array as long as it
 * supports certain calls (lines_foo inside).
 */
exports.textLinesMutator = (lines) => {
  // Mutates lines, an array of strings, in place.
  // Mutation operations have the same constraints as exports operations
  // with respect to newlines, but not the other additional constraints
  // (i.e. ins/del ordering, forbidden no-ops, non-mergeability, final newline).
  // Can be used to mutate lists of strings where the last char of each string
  // is not actually a newline, but for the purposes of N and L values,
  // the caller should pretend it is, and for things to work right in that case, the input
  // to insert() should be a single line with no newlines.
  const curSplice = [0, 0];
  let inSplice = false;
  // position in document after curSplice is applied:
  let curLine = 0;
  let curCol = 0;
  // invariant: if (inSplice) then (curLine is in curSplice[0] + curSplice.length - {2,3}) &&
  //            curLine >= curSplice[0]
  // invariant: if (inSplice && (curLine >= curSplice[0] + curSplice.length - 2)) then
  //            curCol == 0

  const lines_applySplice = (s) => {
    lines.splice.apply(lines, s);
  };

  const lines_toSource = () => lines.toSource();

  const lines_get = (idx) => {
    if (lines.get) {
      return lines.get(idx);
    } else {
      return lines[idx];
    }
  };
  // can be unimplemented if removeLines's return value not needed

  const lines_slice = (start, end) => {
    if (lines.slice) {
      return lines.slice(start, end);
    } else {
      return [];
    }
  };

  const lines_length = () => {
    if ((typeof lines.length) === 'number') {
      return lines.length;
    } else {
      return lines.length();
    }
  };

  const enterSplice = () => {
    curSplice[0] = curLine;
    curSplice[1] = 0;
    if (curCol > 0) {
      putCurLineInSplice();
    }
    inSplice = true;
  };

  const leaveSplice = () => {
    lines_applySplice(curSplice);
    curSplice.length = 2;
    curSplice[0] = curSplice[1] = 0;
    inSplice = false;
  };

  const isCurLineInSplice = () => (curLine - curSplice[0] < (curSplice.length - 2));

  const debugPrint = (typ) => {
    print(`${typ}: ${curSplice.toSource()} / ${curLine},${curCol} / ${lines_toSource()}`);
  };

  const putCurLineInSplice = () => {
    if (!isCurLineInSplice()) {
      curSplice.push(lines_get(curSplice[0] + curSplice[1]));
      curSplice[1]++;
    }
    return 2 + curLine - curSplice[0];
  };

  const skipLines = (L, includeInSplice) => {
    if (L) {
      if (includeInSplice) {
        if (!inSplice) {
          enterSplice();
        }
        for (let i = 0; i < L; i++) {
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
    }
    // debugPrint("skip");
  };

  const skip = (N, L, includeInSplice) => {
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
        // debugPrint("skip");
      }
    }
  };

  const removeLines = (L) => {
    let removed = '';
    if (L) {
      if (!inSplice) {
        enterSplice();
      }

      const nextKLinesText = (k) => {
        const m = curSplice[0] + curSplice[1];
        return lines_slice(m, m + k).join('');
      };
      if (isCurLineInSplice()) {
        // print(curCol);
        if (curCol === 0) {
          removed = curSplice[curSplice.length - 1];
          // print("FOO"); // case foo
          curSplice.length--;
          removed += nextKLinesText(L - 1);
          curSplice[1] += L - 1;
        } else {
          removed = nextKLinesText(L - 1);
          curSplice[1] += L - 1;
          const sline = curSplice.length - 1;
          removed = curSplice[sline].substring(curCol) + removed;
          curSplice[sline] = curSplice[sline].substring(0, curCol) +
            lines_get(curSplice[0] + curSplice[1]);
          curSplice[1] += 1;
        }
      } else {
        removed = nextKLinesText(L);
        curSplice[1] += L;
      }
      // debugPrint("remove");
    }
    return removed;
  };

  const remove = (N, L) => {
    let removed = '';
    if (N) {
      if (L) {
        return removeLines(L);
      } else {
        if (!inSplice) {
          enterSplice();
        }
        const sline = putCurLineInSplice();
        removed = curSplice[sline].substring(curCol, curCol + N);
        curSplice[sline] = curSplice[sline].substring(0, curCol) +
          curSplice[sline].substring(curCol + N);
        // debugPrint("remove");
      }
    }
    return removed;
  };

  const insert = (text, L) => {
    if (text) {
      if (!inSplice) {
        enterSplice();
      }
      if (L) {
        const newLines = exports.splitTextLines(text);
        if (isCurLineInSplice()) {
          // if (curCol == 0) {
          // curSplice.length--;
          // curSplice[1]--;
          // Array.prototype.push.apply(curSplice, newLines);
          // curLine += newLines.length;
          // }
          // else {
          const sline = curSplice.length - 1;
          const theLine = curSplice[sline];
          const lineCol = curCol;
          curSplice[sline] = theLine.substring(0, lineCol) + newLines[0];
          curLine++;
          newLines.splice(0, 1);
          Array.prototype.push.apply(curSplice, newLines);
          curLine += newLines.length;
          curSplice.push(theLine.substring(lineCol));
          curCol = 0;
          // }
        } else {
          Array.prototype.push.apply(curSplice, newLines);
          curLine += newLines.length;
        }
      } else {
        const sline = putCurLineInSplice();
        if (!curSplice[sline]) {
          console.error('curSplice[sline] not populated, actual curSplice contents is ', curSplice, '. Possibly related to https://github.com/ether/etherpad-lite/issues/2802');
        }
        curSplice[sline] =
          curSplice[sline].substring(0, curCol) + text + curSplice[sline].substring(curCol);
        curCol += text.length;
      }
      // debugPrint("insert");
    }
  };

  const hasMore = () => {
    // print(lines.length+" / "+inSplice+" / "+(curSplice.length - 2)+" / "+curSplice[1]);
    let docLines = lines_length();
    if (inSplice) {
      docLines += curSplice.length - 2 - curSplice[1];
    }
    return curLine < docLines;
  };

  const close = () => {
    if (inSplice) {
      leaveSplice();
    }
    // debugPrint("close");
  };

  const self = {
    skip,
    remove,
    insert,
    close,
    hasMore,
    removeLines,
    skipLines,
  };
  return self;
};

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
exports.applyZip = (in1, idx1, in2, idx2, func) => {
  const iter1 = exports.opIterator(in1, idx1);
  const iter2 = exports.opIterator(in2, idx2);
  const assem = exports.smartOpAssembler();
  const op1 = exports.newOp();
  const op2 = exports.newOp();
  const opOut = exports.newOp();
  while (op1.opcode || iter1.hasNext() || op2.opcode || iter2.hasNext()) {
    if ((!op1.opcode) && iter1.hasNext()) iter1.next(op1);
    if ((!op2.opcode) && iter2.hasNext()) iter2.next(op2);
    func(op1, op2, opOut);
    if (opOut.opcode) {
      // print(opOut.toSource());
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
exports.unpack = (cs) => {
  const headerRegex = /Z:([0-9a-z]+)([><])([0-9a-z]+)|/;
  const headerMatch = headerRegex.exec(cs);
  if ((!headerMatch) || (!headerMatch[0])) {
    exports.error(`Not a exports: ${cs}`);
  }
  const oldLen = exports.parseNum(headerMatch[1]);
  const changeSign = (headerMatch[2] === '>') ? 1 : -1;
  const changeMag = exports.parseNum(headerMatch[3]);
  const newLen = oldLen + changeSign * changeMag;
  const opsStart = headerMatch[0].length;
  let opsEnd = cs.indexOf('$');
  if (opsEnd < 0) opsEnd = cs.length;
  return {
    oldLen,
    newLen,
    ops: cs.substring(opsStart, opsEnd),
    charBank: cs.substring(opsEnd + 1),
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
exports.pack = (oldLen, newLen, opsStr, bank) => {
  const lenDiff = newLen - oldLen;
  const lenDiffStr =
    (lenDiff >= 0 ? `>${exports.numToString(lenDiff)}` : `<${exports.numToString(-lenDiff)}`);
  const a = [];
  a.push('Z:', exports.numToString(oldLen), lenDiffStr, opsStr, '$', bank);
  return a.join('');
};

/**
 * Applies a Changeset to a string
 * @params cs {string} String encoded Changeset
 * @params str {string} String to which a Changeset should be applied
 */
exports.applyToText = (cs, str) => {
  const unpacked = exports.unpack(cs);
  exports.assert(
      str.length === unpacked.oldLen, 'mismatched apply: ', str.length, ' / ', unpacked.oldLen);
  const csIter = exports.opIterator(unpacked.ops);
  const bankIter = exports.stringIterator(unpacked.charBank);
  const strIter = exports.stringIterator(str);
  const assem = exports.stringAssembler();
  while (csIter.hasNext()) {
    const op = csIter.next();
    switch (op.opcode) {
      case '+':
      // op is + and op.lines 0: no newlines must be in op.chars
      // op is + and op.lines >0: op.chars must include op.lines newlines
        if (op.lines !== bankIter.peek(op.chars).split('\n').length - 1) {
          throw new Error(`newline count is wrong in op +; cs:${cs} and text:${str}`);
        }
        assem.append(bankIter.take(op.chars));
        break;
      case '-':
      // op is - and op.lines 0: no newlines must be in the deleted string
      // op is - and op.lines >0: op.lines newlines must be in the deleted string
        if (op.lines !== strIter.peek(op.chars).split('\n').length - 1) {
          throw new Error(`newline count is wrong in op -; cs:${cs} and text:${str}`);
        }
        strIter.skip(op.chars);
        break;
      case '=':
      // op is = and op.lines 0: no newlines must be in the copied string
      // op is = and op.lines >0: op.lines newlines must be in the copied string
        if (op.lines !== strIter.peek(op.chars).split('\n').length - 1) {
          throw new Error(`newline count is wrong in op =; cs:${cs} and text:${str}`);
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
 * @param CS {Changeset} the changeset to be applied
 * @param lines The lines to which the changeset needs to be applied
 */
exports.mutateTextLines = (cs, lines) => {
  const unpacked = exports.unpack(cs);
  const csIter = exports.opIterator(unpacked.ops);
  const bankIter = exports.stringIterator(unpacked.charBank);
  const mut = exports.textLinesMutator(lines);
  while (csIter.hasNext()) {
    const op = csIter.next();
    switch (op.opcode) {
      case '+':
        mut.insert(bankIter.take(op.chars), op.lines);
        break;
      case '-':
        mut.remove(op.chars, op.lines);
        break;
      case '=':
        mut.skip(op.chars, op.lines, (!!op.attribs));
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
exports.composeAttributes = (att1, att2, resultIsMutation, pool) => {
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
  const atts = [];
  att1.replace(/\*([0-9a-z]+)/g, (_, a) => {
    atts.push(pool.getAttrib(exports.parseNum(a)));
    return '';
  });
  att2.replace(/\*([0-9a-z]+)/g, (_, a) => {
    const pair = pool.getAttrib(exports.parseNum(a));
    let found = false;
    for (let i = 0; i < atts.length; i++) {
      const oldPair = atts[i];
      if (oldPair[0] === pair[0]) {
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
  const buf = exports.stringAssembler();
  for (let i = 0; i < atts.length; i++) {
    buf.append('*');
    buf.append(exports.numToString(pool.putAttrib(atts[i])));
  }
  // print(att1+" / "+att2+" / "+buf.toString());
  return buf.toString();
};

/**
 * Function used as parameter for applyZip to apply a Changeset to an
 * attribute
 */
exports._slicerZipperFunc = (attOp, csOp, opOut, pool) => {
  // attOp is the op from the sequence that is being operated on, either an
  // attribution string or the earlier of two exportss being composed.
  // pool can be null if definitely not needed.
  // print(csOp.toSource()+" "+attOp.toSource()+" "+opOut.toSource());
  if (attOp.opcode === '-') {
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
          if (attOp.opcode === '=') {
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
          if (attOp.opcode === '=') {
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
          opOut.attribs =
            exports.composeAttributes(attOp.attribs, csOp.attribs, attOp.opcode === '=', pool);
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
          opOut.attribs =
            exports.composeAttributes(attOp.attribs, csOp.attribs, attOp.opcode === '=', pool);
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
exports.applyToAttribution = (cs, astr, pool) => {
  const unpacked = exports.unpack(cs);

  return exports.applyZip(
      astr, 0, unpacked.ops, 0,
      (op1, op2, opOut) => exports._slicerZipperFunc(op1, op2, opOut, pool)
  );
};

/* exports.oneInsertedLineAtATimeOpIterator = function(opsStr, optStartIndex, charBank) {
  var iter = exports.opIterator(opsStr, optStartIndex);
  var bankIndex = 0;

};*/

exports.mutateAttributionLines = (cs, lines, pool) => {
  // dmesg(cs);
  // dmesg(lines.toSource()+" ->");
  const unpacked = exports.unpack(cs);
  const csIter = exports.opIterator(unpacked.ops);
  const csBank = unpacked.charBank;
  let csBankIndex = 0;
  // treat the attribution lines as text lines, mutating a line at a time
  const mut = exports.textLinesMutator(lines);

  let lineIter = null;

  const isNextMutOp = () => (lineIter && lineIter.hasNext()) || mut.hasMore();

  const nextMutOp = (destOp) => {
    if ((!(lineIter && lineIter.hasNext())) && mut.hasMore()) {
      const line = mut.removeLines(1);
      lineIter = exports.opIterator(line);
    }
    if (lineIter && lineIter.hasNext()) {
      lineIter.next(destOp);
    } else {
      destOp.opcode = '';
    }
  };
  let lineAssem = null;

  const outputMutOp = (op) => {
    // print("outputMutOp: "+op.toSource());
    if (!lineAssem) {
      lineAssem = exports.mergingOpAssembler();
    }
    lineAssem.append(op);
    if (op.lines > 0) {
      exports.assert(op.lines === 1, "Can't have op.lines of ", op.lines, ' in attribution lines');
      // ship it to the mut
      mut.insert(lineAssem.toString(), 1);
      lineAssem = null;
    }
  };

  const csOp = exports.newOp();
  const attOp = exports.newOp();
  const opOut = exports.newOp();
  while (csOp.opcode || csIter.hasNext() || attOp.opcode || isNextMutOp()) {
    if ((!csOp.opcode) && csIter.hasNext()) {
      csIter.next(csOp);
    }
    // print(csOp.toSource()+" "+attOp.toSource()+" "+opOut.toSource());
    // print(csOp.opcode+"/"+csOp.lines+"/"+csOp.attribs+"/"+lineAssem+"/"+lineIter+"/"+(lineIter?lineIter.hasNext():null));
    // print("csOp: "+csOp.toSource());
    if ((!csOp.opcode) && (!attOp.opcode) && (!lineAssem) && (!(lineIter && lineIter.hasNext()))) {
      break; // done
    } else if (csOp.opcode === '=' && csOp.lines > 0 &&
      (!csOp.attribs) &&
      (!attOp.opcode) &&
      (!lineAssem) &&
      (!(lineIter && lineIter.hasNext()))) {
      // skip multiple lines; this is what makes small changes not order of the document size
      mut.skipLines(csOp.lines);
      // print("skipped: "+csOp.lines);
      csOp.opcode = '';
    } else if (csOp.opcode === '+') {
      if (csOp.lines > 1) {
        const firstLineLen = csBank.indexOf('\n', csBankIndex) + 1 - csBankIndex;
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
      // print("attOp: "+attOp.toSource());
      exports._slicerZipperFunc(attOp, csOp, opOut, pool);
      if (opOut.opcode) {
        outputMutOp(opOut);
        opOut.opcode = '';
      }
    }
  }

  exports.assert(!lineAssem, `line assembler not finished:${cs}`);
  mut.close();

  // dmesg("-> "+lines.toSource());
};

/**
 * joins several Attribution lines
 * @param theAlines collection of Attribution lines
 * @returns {string} joined Attribution lines
 */
exports.joinAttributionLines = (theAlines) => {
  const assem = exports.mergingOpAssembler();
  for (let i = 0; i < theAlines.length; i++) {
    const aline = theAlines[i];
    const iter = exports.opIterator(aline);
    while (iter.hasNext()) {
      assem.append(iter.next());
    }
  }
  return assem.toString();
};

exports.splitAttributionLines = (attrOps, text) => {
  const iter = exports.opIterator(attrOps);
  const assem = exports.mergingOpAssembler();
  const lines = [];
  let pos = 0;

  const appendOp = (op) => {
    assem.append(op);
    if (op.lines > 0) {
      lines.push(assem.toString());
      assem.clear();
    }
    pos += op.chars;
  };

  while (iter.hasNext()) {
    const op = iter.next();
    let numChars = op.chars;
    let numLines = op.lines;
    while (numLines > 1) {
      const newlineEnd = text.indexOf('\n', pos) + 1;
      exports.assert(newlineEnd > 0, 'newlineEnd <= 0 in splitAttributionLines');
      op.chars = newlineEnd - pos;
      op.lines = 1;
      appendOp(op);
      numChars -= op.chars;
      numLines -= op.lines;
    }
    if (numLines === 1) {
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
exports.splitTextLines = (text) => text.match(/[^\n]*(?:\n|[^\n]$)/g);

/**
 * compose two Changesets
 * @param cs1 {Changeset} first Changeset
 * @param cs2 {Changeset} second Changeset
 * @param pool {AtribsPool} Attribs pool
 */
exports.compose = (cs1, cs2, pool) => {
  const unpacked1 = exports.unpack(cs1);
  const unpacked2 = exports.unpack(cs2);
  const len1 = unpacked1.oldLen;
  const len2 = unpacked1.newLen;
  exports.assert(len2 === unpacked2.oldLen, 'mismatched composition of two changesets');
  const len3 = unpacked2.newLen;
  const bankIter1 = exports.stringIterator(unpacked1.charBank);
  const bankIter2 = exports.stringIterator(unpacked2.charBank);
  const bankAssem = exports.stringAssembler();

  const newOps = exports.applyZip(unpacked1.ops, 0, unpacked2.ops, 0, (op1, op2, opOut) => {
    // var debugBuilder = exports.stringAssembler();
    // debugBuilder.append(exports.opString(op1));
    // debugBuilder.append(',');
    // debugBuilder.append(exports.opString(op2));
    // debugBuilder.append(' / ');
    const op1code = op1.opcode;
    const op2code = op2.opcode;
    if (op1code === '+' && op2code === '-') {
      bankIter1.skip(Math.min(op1.chars, op2.chars));
    }
    exports._slicerZipperFunc(op1, op2, opOut, pool);
    if (opOut.opcode === '+') {
      if (op2code === '+') {
        bankAssem.append(bankIter2.take(opOut.chars));
      } else {
        bankAssem.append(bankIter1.take(opOut.chars));
      }
    }

    // debugBuilder.append(exports.opString(op1));
    // debugBuilder.append(',');
    // debugBuilder.append(exports.opString(op2));
    // debugBuilder.append(' -> ');
    // debugBuilder.append(exports.opString(opOut));
    // print(debugBuilder.toString());
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
exports.attributeTester = (attribPair, pool) => {
  if (!pool) {
    return never;
  }
  const attribNum = pool.putAttrib(attribPair, true);
  if (attribNum < 0) {
    return never;
  } else {
    const re = new RegExp(`\\*${exports.numToString(attribNum)}(?!\\w)`);
    return (attribs) => re.test(attribs);
  }

  const never = (attribs) => false;
};

/**
 * creates the identity Changeset of length N
 * @param N {int} length of the identity changeset
 */
exports.identity = (N) => exports.pack(N, N, '', '');

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
exports.makeSplice = (oldFullText, spliceStart, numRemoved, newText, optNewTextAPairs, pool) => {
  const oldLen = oldFullText.length;

  if (spliceStart >= oldLen) {
    spliceStart = oldLen - 1;
  }
  if (numRemoved > oldFullText.length - spliceStart) {
    numRemoved = oldFullText.length - spliceStart;
  }
  const oldText = oldFullText.substring(spliceStart, spliceStart + numRemoved);
  const newLen = oldLen + newText.length - oldText.length;

  const assem = exports.smartOpAssembler();
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
exports.toSplices = (cs) => {
  //
  const unpacked = exports.unpack(cs);
  const splices = [];

  let oldPos = 0;
  const iter = exports.opIterator(unpacked.ops);
  const charIter = exports.stringIterator(unpacked.charBank);
  let inSplice = false;
  while (iter.hasNext()) {
    const op = iter.next();
    if (op.opcode === '=') {
      oldPos += op.chars;
      inSplice = false;
    } else {
      if (!inSplice) {
        splices.push([oldPos, oldPos, '']);
        inSplice = true;
      }
      if (op.opcode === '-') {
        oldPos += op.chars;
        splices[splices.length - 1][1] += op.chars;
      } else if (op.opcode === '+') {
        splices[splices.length - 1][2] += charIter.take(op.chars);
      }
    }
  }

  return splices;
};

/**
 *
 */
exports.characterRangeFollow = (cs, startChar, endChar, insertionsAfter) => {
  let newStartChar = startChar;
  let newEndChar = endChar;
  const splices = exports.toSplices(cs);
  let lengthChangeSoFar = 0;
  for (let i = 0; i < splices.length; i++) {
    const splice = splices[i];
    const spliceStart = splice[0] + lengthChangeSoFar;
    const spliceEnd = splice[1] + lengthChangeSoFar;
    const newTextLength = splice[2].length;
    const thisLengthChange = newTextLength - (spliceEnd - spliceStart);

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
exports.moveOpsToNewPool = (cs, oldPool, newPool) => {
  // works on exports or attribution string
  let dollarPos = cs.indexOf('$');
  if (dollarPos < 0) {
    dollarPos = cs.length;
  }
  const upToDollar = cs.substring(0, dollarPos);
  const fromDollar = cs.substring(dollarPos);
  // order of attribs stays the same
  return upToDollar.replace(/\*([0-9a-z]+)/g, (_, a) => {
    const oldNum = exports.parseNum(a);
    let pair = oldPool.getAttrib(oldNum);

    /*
     * Setting an empty pair. Required for when delete pad contents / attributes
     * while another user has the timeslider open.
     *
     * Fixes https://github.com/ether/etherpad-lite/issues/3932
     */
    if (!pair) {
      pair = [];
    }

    const newNum = newPool.putAttrib(pair);
    return `*${exports.numToString(newNum)}`;
  }) + fromDollar;
};

/**
 * create an attribution inserting a text
 * @param text {string} text to be inserted
 */
exports.makeAttribution = (text) => {
  const assem = exports.smartOpAssembler();
  assem.appendOpWithText('+', text);
  return assem.toString();
};

/**
 * Iterates over attributes in exports, attribution string, or attribs property of an op
 * and runs function func on them
 * @param cs {Changeset} changeset
 * @param func {function} function to be called
 */
exports.eachAttribNumber = (cs, func) => {
  let dollarPos = cs.indexOf('$');
  if (dollarPos < 0) {
    dollarPos = cs.length;
  }
  const upToDollar = cs.substring(0, dollarPos);

  upToDollar.replace(/\*([0-9a-z]+)/g, (_, a) => {
    func(exports.parseNum(a));
    return '';
  });
};

/**
 * Filter attributes which should remain in a Changeset
 * callable on a exports, attribution string, or attribs property of an op,
 * though it may easily create adjacent ops that can be merged.
 * @param cs {Changeset} changeset to be filtered
 * @param filter {function} fnc which returns true if an
 *        attribute X (int) should be kept in the Changeset
 */
exports.filterAttribNumbers = (cs, filter) => exports.mapAttribNumbers(cs, filter);

/**
 * does exactly the same as exports.filterAttribNumbers
 */
exports.mapAttribNumbers = (cs, func) => {
  let dollarPos = cs.indexOf('$');
  if (dollarPos < 0) {
    dollarPos = cs.length;
  }
  const upToDollar = cs.substring(0, dollarPos);

  const newUpToDollar = upToDollar.replace(/\*([0-9a-z]+)/g, (s, a) => {
    const n = func(exports.parseNum(a));
    if (n === true) {
      return s;
    } else if ((typeof n) === 'number') {
      return `*${exports.numToString(n)}`;
    } else {
      return '';
    }
  });

  return newUpToDollar + cs.substring(dollarPos);
};

/**
 * Create a Changeset going from Identity to a certain state
 * @params text {string} text of the final change
 * @attribs attribs {string} optional, operations which insert
 *    the text and also puts the right attributes
 */
exports.makeAText = (text, attribs) => ({
  text,
  attribs: (attribs || exports.makeAttribution(text)),
});

/**
 * Apply a Changeset to a AText
 * @param cs {Changeset} Changeset to be applied
 * @param atext {AText}
 * @param pool {AttribPool} Attribute Pool to add to
 */
exports.applyToAText = (cs, atext, pool) => ({
  text: exports.applyToText(cs, atext.text),
  attribs: exports.applyToAttribution(cs, atext.attribs, pool),
});

/**
 * Clones a AText structure
 * @param atext {AText}
 */
exports.cloneAText = (atext) => {
  if (atext) {
    return {
      text: atext.text,
      attribs: atext.attribs,
    };
  } else { exports.error('atext is null'); }
};

/**
 * Copies a AText structure from atext1 to atext2
 * @param atext {AText}
 */
exports.copyAText = (atext1, atext2) => {
  atext2.text = atext1.text;
  atext2.attribs = atext1.attribs;
};

/**
 * Append the set of operations from atext to an assembler
 * @param atext {AText}
 * @param assem Assembler like smartOpAssembler
 */
exports.appendATextToAssembler = (atext, assem) => {
  // intentionally skips last newline char of atext
  const iter = exports.opIterator(atext.attribs);
  const op = exports.newOp();
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
        const nextToLastNewlineEnd =
        atext.text.lastIndexOf('\n', atext.text.length - 2) + 1;
        const lastLineLength = atext.text.length - nextToLastNewlineEnd - 1;
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
exports.prepareForWire = (cs, pool) => {
  const newPool = new AttributePool();
  const newCs = exports.moveOpsToNewPool(cs, pool, newPool);
  return {
    translated: newCs,
    pool: newPool,
  };
};

/**
 * Checks if a changeset s the identity changeset
 */
exports.isIdentity = (cs) => {
  const unpacked = exports.unpack(cs);
  return unpacked.ops === '' && unpacked.oldLen === unpacked.newLen;
};

/**
 * returns all the values of attributes with a certain key
 * in an Op attribs string
 * @param attribs {string} Attribute string of a Op
 * @param key {string} string to be seached for
 * @param pool {AttribPool} attribute pool
 */
exports.opAttributeValue = (op, key, pool) => exports.attribsAttributeValue(op.attribs, key, pool);

/**
 * returns all the values of attributes with a certain key
 * in an attribs string
 * @param attribs {string} Attribute string
 * @param key {string} string to be seached for
 * @param pool {AttribPool} attribute pool
 */
exports.attribsAttributeValue = (attribs, key, pool) => {
  let value = '';
  if (attribs) {
    exports.eachAttribNumber(attribs, (n) => {
      if (pool.getAttribKey(n) === key) {
        value = pool.getAttribValue(n);
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
exports.builder = (oldLen) => {
  const assem = exports.smartOpAssembler();
  const o = exports.newOp();
  const charBank = exports.stringAssembler();

  var self = {
    // attribs are [[key1,value1],[key2,value2],...] or '*0*1...' (no pool needed in latter case)
    keep: (N, L, attribs, pool) => {
      o.opcode = '=';
      o.attribs = (attribs && exports.makeAttribsString('=', attribs, pool)) || '';
      o.chars = N;
      o.lines = (L || 0);
      assem.append(o);
      return self;
    },
    keepText: (text, attribs, pool) => {
      assem.appendOpWithText('=', text, attribs, pool);
      return self;
    },
    insert: (text, attribs, pool) => {
      assem.appendOpWithText('+', text, attribs, pool);
      charBank.append(text);
      return self;
    },
    remove: (N, L) => {
      o.opcode = '-';
      o.attribs = '';
      o.chars = N;
      o.lines = (L || 0);
      assem.append(o);
      return self;
    },
    toString: () => {
      assem.endDocument();
      const newLen = oldLen + assem.getLengthChange();
      return exports.pack(oldLen, newLen, assem.toString(), charBank.toString());
    },
  };

  return self;
};

exports.makeAttribsString = (opcode, attribs, pool) => {
  // makeAttribsString(opcode, '*3') or makeAttribsString(opcode, [['foo','bar']], myPool) work
  if (!attribs) {
    return '';
  } else if ((typeof attribs) === 'string') {
    return attribs;
  } else if (pool && attribs && attribs.length) {
    if (attribs.length > 1) {
      attribs = attribs.slice();
      attribs.sort();
    }
    const result = [];
    for (let i = 0; i < attribs.length; i++) {
      const pair = attribs[i];
      if (opcode === '=' || (opcode === '+' && pair[1])) {
        result.push(`*${exports.numToString(pool.putAttrib(pair))}`);
      }
    }
    return result.join('');
  }
};

// like "substring" but on a single-line attribution string
exports.subattribution = (astr, start, optEnd) => {
  const iter = exports.opIterator(astr, 0);
  const assem = exports.smartOpAssembler();
  const attOp = exports.newOp();
  const csOp = exports.newOp();
  const opOut = exports.newOp();

  const doCsOp = () => {
    if (csOp.chars) {
      while (csOp.opcode && (attOp.opcode || iter.hasNext())) {
        if (!attOp.opcode) iter.next(attOp);

        if (csOp.opcode &&
          attOp.opcode &&
          csOp.chars >= attOp.chars &&
          attOp.lines > 0 &&
          csOp.lines <= 0) {
          csOp.lines++;
        }

        exports._slicerZipperFunc(attOp, csOp, opOut, null);
        if (opOut.opcode) {
          assem.append(opOut);
          opOut.opcode = '';
        }
      }
    }
  };

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

exports.inverse = (cs, lines, alines, pool) => {
  // lines and alines are what the exports is meant to apply to.
  // They may be arrays or objects with .get(i) and .length methods.
  // They include final newlines on lines.

  const lines_get = (idx) => {
    if (lines.get) {
      return lines.get(idx);
    } else {
      return lines[idx];
    }
  };

  const alines_get = (idx) => {
    if (alines.get) {
      return alines.get(idx);
    } else {
      return alines[idx];
    }
  };

  let curLine = 0;
  let curChar = 0;
  let curLineOpIter = null;
  let curLineOpIterLine;
  const curLineNextOp = exports.newOp('+');

  const unpacked = exports.unpack(cs);
  const csIter = exports.opIterator(unpacked.ops);
  const builder = exports.builder(unpacked.newLen);

  const consumeAttribRuns = (numChars, func /* (len, attribs, endsLine)*/) => {
    if ((!curLineOpIter) || (curLineOpIterLine !== curLine)) {
      // create curLineOpIter and advance it to curChar
      curLineOpIter = exports.opIterator(alines_get(curLine));
      curLineOpIterLine = curLine;
      let indexIntoLine = 0;
      let done = false;
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
      const charsToUse = Math.min(numChars, curLineNextOp.chars);
      func(
          charsToUse, curLineNextOp.attribs,
          charsToUse === curLineNextOp.chars &&
        curLineNextOp.lines > 0
      );
      numChars -= charsToUse;
      curLineNextOp.chars -= charsToUse;
      curChar += charsToUse;
    }

    if ((!curLineNextOp.chars) && (!curLineOpIter.hasNext())) {
      curLine++;
      curChar = 0;
    }
  };

  const skip = (N, L) => {
    if (L) {
      curLine += L;
      curChar = 0;
    } else if (curLineOpIter && curLineOpIterLine === curLine) {
      consumeAttribRuns(N, () => {});
    } else {
      curChar += N;
    }
  };

  const nextText = (numChars) => {
    let len = 0;
    const assem = exports.stringAssembler();
    const firstString = lines_get(curLine).substring(curChar);
    len += firstString.length;
    assem.append(firstString);

    let lineNum = curLine + 1;
    while (len < numChars) {
      const nextString = lines_get(lineNum);
      len += nextString.length;
      assem.append(nextString);
      lineNum++;
    }

    return assem.toString().substring(0, numChars);
  };

  const cachedStrFunc = (func) => {
    const cache = {};
    return (s) => {
      if (!cache[s]) {
        cache[s] = func(s);
      }
      return cache[s];
    };
  };

  const attribKeys = [];
  const attribValues = [];
  while (csIter.hasNext()) {
    const csOp = csIter.next();
    if (csOp.opcode === '=') {
      if (csOp.attribs) {
        attribKeys.length = 0;
        attribValues.length = 0;
        exports.eachAttribNumber(csOp.attribs, (n) => {
          attribKeys.push(pool.getAttribKey(n));
          attribValues.push(pool.getAttribValue(n));
        });
        const undoBackToAttribs = cachedStrFunc((attribs) => {
          const backAttribs = [];
          for (let i = 0; i < attribKeys.length; i++) {
            const appliedKey = attribKeys[i];
            const appliedValue = attribValues[i];
            const oldValue = exports.attribsAttributeValue(attribs, appliedKey, pool);
            if (appliedValue !== oldValue) {
              backAttribs.push([appliedKey, oldValue]);
            }
          }
          return exports.makeAttribsString('=', backAttribs, pool);
        });
        consumeAttribRuns(csOp.chars, (len, attribs, endsLine) => {
          builder.keep(len, endsLine ? 1 : 0, undoBackToAttribs(attribs));
        });
      } else {
        skip(csOp.chars, csOp.lines);
        builder.keep(csOp.chars, csOp.lines);
      }
    } else if (csOp.opcode === '+') {
      builder.remove(csOp.chars, csOp.lines);
    } else if (csOp.opcode === '-') {
      const textBank = nextText(csOp.chars);
      let textBankIndex = 0;
      consumeAttribRuns(csOp.chars, (len, attribs, endsLine) => {
        builder.insert(textBank.substr(textBankIndex, len), attribs);
        textBankIndex += len;
      });
    }
  }

  return exports.checkRep(builder.toString());
};

// %CLIENT FILE ENDS HERE%
exports.follow = (cs1, cs2, reverseInsertOrder, pool) => {
  const unpacked1 = exports.unpack(cs1);
  const unpacked2 = exports.unpack(cs2);
  const len1 = unpacked1.oldLen;
  const len2 = unpacked2.oldLen;
  exports.assert(len1 === len2, 'mismatched follow - cannot transform cs1 on top of cs2');
  const chars1 = exports.stringIterator(unpacked1.charBank);
  const chars2 = exports.stringIterator(unpacked2.charBank);

  const oldLen = unpacked1.newLen;
  let oldPos = 0;
  let newLen = 0;

  const hasInsertFirst = exports.attributeTester(['insertorder', 'first'], pool);

  const newOps = exports.applyZip(unpacked1.ops, 0, unpacked2.ops, 0, (op1, op2, opOut) => {
    if (op1.opcode === '+' || op2.opcode === '+') {
      let whichToDo;
      if (op2.opcode !== '+') {
        whichToDo = 1;
      } else if (op1.opcode !== '+') {
        whichToDo = 2;
      } else {
        // both +
        const firstChar1 = chars1.peek(1);
        const firstChar2 = chars2.peek(1);
        const insertFirst1 = hasInsertFirst(op1.attribs);
        const insertFirst2 = hasInsertFirst(op2.attribs);

        if (insertFirst1 && !insertFirst2) {
          whichToDo = 1;
        } else if (insertFirst2 && !insertFirst1) {
          whichToDo = 2;
        } else if (firstChar1 === '\n' && firstChar2 !== '\n') {
          // insert string that doesn't start with a newline first so as not to break up lines
          whichToDo = 2;
        } else if (firstChar1 !== '\n' && firstChar2 === '\n') {
          whichToDo = 1;
        } else if (reverseInsertOrder) {
          // break symmetry:
          whichToDo = 2;
        } else {
          whichToDo = 1;
        }
      }
      if (whichToDo === 1) {
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
    } else if (op1.opcode === '-') {
      if (!op2.opcode) {
        op1.opcode = '';
      } else if (op1.chars <= op2.chars) {
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
    } else if (op2.opcode === '-') {
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

exports.followAttributes = (att1, att2, pool) => {
  // The merge of two sets of attribute changes to the same text
  // takes the lexically-earlier value if there are two values
  // for the same key.  Otherwise, all key/value changes from
  // both attribute sets are taken.  This operation is the "follow",
  // so a set of changes is produced that can be applied to att1
  // to produce the merged set.
  if ((!att2) || (!pool)) return '';
  if (!att1) return att2;
  const atts = [];
  att2.replace(/\*([0-9a-z]+)/g, (_, a) => {
    atts.push(pool.getAttrib(exports.parseNum(a)));
    return '';
  });
  att1.replace(/\*([0-9a-z]+)/g, (_, a) => {
    const pair1 = pool.getAttrib(exports.parseNum(a));
    for (let i = 0; i < atts.length; i++) {
      const pair2 = atts[i];
      if (pair1[0] === pair2[0]) {
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
  const buf = exports.stringAssembler();
  for (let i = 0; i < atts.length; i++) {
    buf.append('*');
    buf.append(exports.numToString(pool.putAttrib(atts[i])));
  }
  return buf.toString();
};

exports.composeWithDeletions = (cs1, cs2, pool) => {
  const unpacked1 = exports.unpack(cs1);
  const unpacked2 = exports.unpack(cs2);
  const len1 = unpacked1.oldLen;
  const len2 = unpacked1.newLen;
  exports.assert(len2 === unpacked2.oldLen, 'mismatched composition of two changesets');
  const len3 = unpacked2.newLen;
  const bankIter1 = exports.stringIterator(unpacked1.charBank);
  const bankIter2 = exports.stringIterator(unpacked2.charBank);
  const bankAssem = exports.stringAssembler();

  const newOps = exports.applyZip(unpacked1.ops, 0, unpacked2.ops, 0, (op1, op2, opOut) => {
    const op1code = op1.opcode;
    const op2code = op2.opcode;
    if (op1code === '+' && op2code === '-') {
      bankIter1.skip(Math.min(op1.chars, op2.chars));
    }
    exports._slicerZipperFuncWithDeletions(op1, op2, opOut, pool);
    if (opOut.opcode === '+') {
      if (op2code === '+') {
        bankAssem.append(bankIter2.take(opOut.chars));
      } else {
        bankAssem.append(bankIter1.take(opOut.chars));
      }
    }
  });

  return exports.pack(len1, len3, newOps, bankAssem.toString());
};

// This function is 95% like _slicerZipperFunc,
// we just changed two lines to ensure it merges the attribs of deletions properly.
// This is necassary for correct paddiff. But to ensure these changes doesn't affect
// anything else, we've created a seperate function only used for paddiffs
exports._slicerZipperFuncWithDeletions = (attOp, csOp, opOut, pool) => {
  // attOp is the op from the sequence that is being operated on, either an
  // attribution string or the earlier of two exportss being composed.
  // pool can be null if definitely not needed.
  // print(csOp.toSource()+" "+attOp.toSource()+" "+opOut.toSource());
  if (attOp.opcode === '-') {
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
          if (attOp.opcode === '=') {
            opOut.opcode = '-';
            opOut.chars = csOp.chars;
            opOut.lines = csOp.lines;
            opOut.attribs = csOp.attribs; // changed by yammer
          }
          attOp.chars -= csOp.chars;
          attOp.lines -= csOp.lines;
          csOp.opcode = '';
          if (!attOp.chars) {
            attOp.opcode = '';
          }
        } else {
          // delete and keep going
          if (attOp.opcode === '=') {
            opOut.opcode = '-';
            opOut.chars = attOp.chars;
            opOut.lines = attOp.lines;
            opOut.attribs = csOp.attribs; // changed by yammer
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
          opOut.attribs =
            exports.composeAttributes(attOp.attribs, csOp.attribs, attOp.opcode === '=', pool);
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
          opOut.attribs =
            exports.composeAttributes(attOp.attribs, csOp.attribs, attOp.opcode === '=', pool);
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
