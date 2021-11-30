'use strict';

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
 * This is the Changeset library copied from the old Etherpad with some modifications
 * to use it in node.js. The original can be found at:
 * https://github.com/ether/pad/blob/master/infrastructure/ace/www/easysync2.js
 */

const AttributeMap = require('./AttributeMap');
const AttributePool = require('./AttributePool');
const attributes = require('./attributes');
const {padutils} = require('./pad_utils');

/**
 * A `[key, value]` pair of strings describing a text attribute.
 *
 * @typedef {[string, string]} Attribute
 */

/**
 * A concatenated sequence of zero or more attribute identifiers, each one represented by an
 * asterisk followed by a base-36 encoded attribute number.
 *
 * Examples: '', '*0', '*3*j*z*1q'
 *
 * @typedef {string} AttributeString
 */

/**
 * This method is called whenever there is an error in the sync process.
 *
 * @param {string} msg - Just some message
 */
const error = (msg) => {
  const e = new Error(msg);
  e.easysync = true;
  throw e;
};

/**
 * Assert that a condition is truthy. If the condition is falsy, the `error` function is called to
 * throw an exception.
 *
 * @param {boolean} b - assertion condition
 * @param {string} msg - error message to include in the exception
 * @type {(b: boolean, msg: string) => asserts b}
 */
const assert = (b, msg) => {
  if (!b) error(`Failed assertion: ${msg}`);
};

/**
 * Parses a number from string base 36.
 *
 * @param {string} str - string of the number in base 36
 * @returns {number} number
 */
exports.parseNum = (str) => parseInt(str, 36);

/**
 * Writes a number in base 36 and puts it in a string.
 *
 * @param {number} num - number
 * @returns {string} string
 */
exports.numToString = (num) => num.toString(36).toLowerCase();

/**
 * An operation to apply to a shared document.
 */
class Op {
  /**
   * @param {(''|'='|'+'|'-')} [opcode=''] - Initial value of the `opcode` property.
   */
  constructor(opcode = '') {
    /**
     * The operation's operator:
     *   - '=': Keep the next `chars` characters (containing `lines` newlines) from the base
     *     document.
     *   - '-': Remove the next `chars` characters (containing `lines` newlines) from the base
     *     document.
     *   - '+': Insert `chars` characters (containing `lines` newlines) at the current position in
     *     the document. The inserted characters come from the changeset's character bank.
     *   - '' (empty string): Invalid operator used in some contexts to signifiy the lack of an
     *     operation.
     *
     * @type {(''|'='|'+'|'-')}
     * @public
     */
    this.opcode = opcode;

    /**
     * The number of characters to keep, insert, or delete.
     *
     * @type {number}
     * @public
     */
    this.chars = 0;

    /**
     * The number of characters among the `chars` characters that are newlines. If non-zero, the
     * last character must be a newline.
     *
     * @type {number}
     * @public
     */
    this.lines = 0;

    /**
     * Identifiers of attributes to apply to the text, represented as a repeated (zero or more)
     * sequence of asterisk followed by a non-negative base-36 (lower-case) integer. For example,
     * '*2*1o' indicates that attributes 2 and 60 apply to the text affected by the operation. The
     * identifiers come from the document's attribute pool.
     *
     * For keep ('=') operations, the attributes are merged with the base text's existing
     * attributes:
     *   - A keep op attribute with a non-empty value replaces an existing base text attribute that
     *     has the same key.
     *   - A keep op attribute with an empty value is interpreted as an instruction to remove an
     *     existing base text attribute that has the same key, if one exists.
     *
     * This is the empty string for remove ('-') operations.
     *
     * @type {string}
     * @public
     */
    this.attribs = '';
  }

  toString() {
    if (!this.opcode) throw new TypeError('null op');
    if (typeof this.attribs !== 'string') throw new TypeError('attribs must be a string');
    const l = this.lines ? `|${exports.numToString(this.lines)}` : '';
    return this.attribs + l + this.opcode + exports.numToString(this.chars);
  }
}
exports.Op = Op;

/**
 * Describes changes to apply to a document. Does not include the attribute pool or the original
 * document.
 *
 * @typedef {object} Changeset
 * @property {number} oldLen - The length of the base document.
 * @property {number} newLen - The length of the document after applying the changeset.
 * @property {string} ops - Serialized sequence of operations. Use `deserializeOps` to parse this
 *     string.
 * @property {string} charBank - Characters inserted by insert operations.
 */

/**
 * Returns the required length of the text before changeset can be applied.
 *
 * @param {string} cs - String representation of the Changeset
 * @returns {number} oldLen property
 */
exports.oldLen = (cs) => exports.unpack(cs).oldLen;

/**
 * Returns the length of the text after changeset is applied.
 *
 * @param {string} cs - String representation of the Changeset
 * @returns {number} newLen property
 */
exports.newLen = (cs) => exports.unpack(cs).newLen;

/**
 * Parses a string of serialized changeset operations.
 *
 * @param {string} ops - Serialized changeset operations.
 * @yields {Op}
 * @returns {Generator<Op>}
 */
exports.deserializeOps = function* (ops) {
  // TODO: Migrate to String.prototype.matchAll() once there is enough browser support.
  const regex = /((?:\*[0-9a-z]+)*)(?:\|([0-9a-z]+))?([-+=])([0-9a-z]+)|(.)/g;
  let match;
  while ((match = regex.exec(ops)) != null) {
    if (match[5] === '$') return; // Start of the insert operation character bank.
    if (match[5] != null) error(`invalid operation: ${ops.slice(regex.lastIndex - 1)}`);
    const op = new Op(match[3]);
    op.lines = exports.parseNum(match[2] || '0');
    op.chars = exports.parseNum(match[4]);
    op.attribs = match[1];
    yield op;
  }
};

/**
 * Iterator over a changeset's operations.
 *
 * Note: This class does NOT implement the ECMAScript iterable or iterator protocols.
 *
 * @deprecated Use `deserializeOps` instead.
 */
class OpIter {
  /**
   * @param {string} ops - String encoding the change operations to iterate over.
   */
  constructor(ops) {
    this._gen = exports.deserializeOps(ops);
    this._next = this._gen.next();
  }

  /**
   * @returns {boolean} Whether there are any remaining operations.
   */
  hasNext() {
    return !this._next.done;
  }

  /**
   * Returns the next operation object and advances the iterator.
   *
   * Note: This does NOT implement the ECMAScript iterator protocol.
   *
   * @param {Op} [opOut] - Deprecated. Operation object to recycle for the return value.
   * @returns {Op} The next operation, or an operation with a falsy `opcode` property if there are
   *     no more operations.
   */
  next(opOut = new Op()) {
    if (this.hasNext()) {
      copyOp(this._next.value, opOut);
      this._next = this._gen.next();
    } else {
      clearOp(opOut);
    }
    return opOut;
  }
}

/**
 * Creates an iterator which decodes string changeset operations.
 *
 * @deprecated Use `deserializeOps` instead.
 * @param {string} opsStr - String encoding of the change operations to perform.
 * @returns {OpIter} Operator iterator object.
 */
exports.opIterator = (opsStr) => {
  padutils.warnDeprecated(
      'Changeset.opIterator() is deprecated; use Changeset.deserializeOps() instead');
  return new OpIter(opsStr);
};

/**
 * Cleans an Op object.
 *
 * @param {Op} op - object to clear
 */
const clearOp = (op) => {
  op.opcode = '';
  op.chars = 0;
  op.lines = 0;
  op.attribs = '';
};

/**
 * Creates a new Op object
 *
 * @deprecated Use the `Op` class instead.
 * @param {('+'|'-'|'='|'')} [optOpcode=''] - The operation's operator.
 * @returns {Op}
 */
exports.newOp = (optOpcode) => {
  padutils.warnDeprecated('Changeset.newOp() is deprecated; use the Changeset.Op class instead');
  return new Op(optOpcode);
};

/**
 * Copies op1 to op2
 *
 * @param {Op} op1 - src Op
 * @param {Op} [op2] - dest Op. If not given, a new Op is used.
 * @returns {Op} `op2`
 */
const copyOp = (op1, op2 = new Op()) => Object.assign(op2, op1);

/**
 * Serializes a sequence of Ops.
 *
 * @typedef {object} OpAssembler
 * @property {Function} append -
 * @property {Function} clear -
 * @property {Function} toString -
 */

/**
 * Efficiently merges consecutive operations that are mergeable, ignores no-ops, and drops final
 * pure "keeps". It does not re-order operations.
 *
 * @typedef {object} MergingOpAssembler
 * @property {Function} append -
 * @property {Function} clear -
 * @property {Function} endDocument -
 * @property {Function} toString -
 */

/**
 * Generates operations from the given text and attributes.
 *
 * @param {('-'|'+'|'=')} opcode - The operator to use.
 * @param {string} text - The text to remove/add/keep.
 * @param {(Iterable<Attribute>|AttributeString)} [attribs] - The attributes to insert into the pool
 *     (if necessary) and encode. If an attribute string, no checking is performed to ensure that
 *     the attributes exist in the pool, are in the canonical order, and contain no duplicate keys.
 *     If this is an iterable of attributes, `pool` must be non-null.
 * @param {?AttributePool} pool - Attribute pool. Required if `attribs` is an iterable of
 *     attributes, ignored if `attribs` is an attribute string.
 * @yields {Op} One or two ops (depending on the presense of newlines) that cover the given text.
 * @returns {Generator<Op>}
 */
const opsFromText = function* (opcode, text, attribs = '', pool = null) {
  const op = new Op(opcode);
  op.attribs = typeof attribs === 'string'
    ? attribs : new AttributeMap(pool).update(attribs || [], opcode === '+').toString();
  const lastNewlinePos = text.lastIndexOf('\n');
  if (lastNewlinePos < 0) {
    op.chars = text.length;
    op.lines = 0;
    yield op;
  } else {
    op.chars = lastNewlinePos + 1;
    op.lines = text.match(/\n/g).length;
    yield op;
    const op2 = copyOp(op);
    op2.chars = text.length - (lastNewlinePos + 1);
    op2.lines = 0;
    yield op2;
  }
};

/**
 * Creates an object that allows you to append operations (type Op) and also compresses them if
 * possible. Like MergingOpAssembler, but able to produce conforming exportss from slightly looser
 * input, at the cost of speed. Specifically:
 *   - merges consecutive operations that can be merged
 *   - strips final "="
 *   - ignores 0-length changes
 *   - reorders consecutive + and - (which MergingOpAssembler doesn't do)
 *
 * @typedef {object} SmartOpAssembler
 * @property {Function} append -
 * @property {Function} appendOpWithText -
 * @property {Function} clear -
 * @property {Function} endDocument -
 * @property {Function} getLengthChange -
 * @property {Function} toString -
 */

/**
 * Used to check if a Changeset is valid. This function does not check things that require access to
 * the attribute pool (e.g., attribute order) or original text (e.g., newline positions).
 *
 * @param {string} cs - Changeset to check
 * @returns {string} the checked Changeset
 */
exports.checkRep = (cs) => {
  const unpacked = exports.unpack(cs);
  const oldLen = unpacked.oldLen;
  const newLen = unpacked.newLen;
  const ops = unpacked.ops;
  let charBank = unpacked.charBank;

  const assem = exports.smartOpAssembler();
  let oldPos = 0;
  let calcNewLen = 0;
  for (const o of exports.deserializeOps(ops)) {
    switch (o.opcode) {
      case '=':
        oldPos += o.chars;
        calcNewLen += o.chars;
        break;
      case '-':
        oldPos += o.chars;
        assert(oldPos <= oldLen, `${oldPos} > ${oldLen} in ${cs}`);
        break;
      case '+':
      {
        assert(charBank.length >= o.chars, 'Invalid changeset: not enough chars in charBank');
        const chars = charBank.slice(0, o.chars);
        const nlines = (chars.match(/\n/g) || []).length;
        assert(nlines === o.lines,
            'Invalid changeset: number of newlines in insert op does not match the charBank');
        assert(o.lines === 0 || chars.endsWith('\n'),
            'Invalid changeset: multiline insert op does not end with a newline');
        charBank = charBank.slice(o.chars);
        calcNewLen += o.chars;
        assert(calcNewLen <= newLen, `${calcNewLen} > ${newLen} in ${cs}`);
        break;
      }
      default:
        assert(false, `Invalid changeset: Unknown opcode: ${JSON.stringify(o.opcode)}`);
    }
    assem.append(o);
  }
  calcNewLen += oldLen - oldPos;
  assert(calcNewLen === newLen, 'Invalid changeset: claimed length does not match actual length');
  assert(charBank === '', 'Invalid changeset: excess characters in the charBank');
  assem.endDocument();
  const normalized = exports.pack(oldLen, calcNewLen, assem.toString(), unpacked.charBank);
  assert(normalized === cs, 'Invalid changeset: not in canonical form');
  return cs;
};

/**
 * @returns {SmartOpAssembler}
 */
exports.smartOpAssembler = () => {
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

  /**
   * Generates operations from the given text and attributes.
   *
   * @deprecated Use `opsFromText` instead.
   * @param {('-'|'+'|'=')} opcode - The operator to use.
   * @param {string} text - The text to remove/add/keep.
   * @param {(string|Iterable<Attribute>)} attribs - The attributes to apply to the operations.
   * @param {?AttributePool} pool - Attribute pool. Only required if `attribs` is an iterable of
   *     attribute key, value pairs.
   */
  const appendOpWithText = (opcode, text, attribs, pool) => {
    padutils.warnDeprecated('Changeset.smartOpAssembler().appendOpWithText() is deprecated; ' +
                            'use opsFromText() instead.');
    for (const op of opsFromText(opcode, text, attribs, pool)) append(op);
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

/**
 * @returns {MergingOpAssembler}
 */
exports.mergingOpAssembler = () => {
  const assem = exports.opAssembler();
  const bufOp = new Op();

  // If we get, for example, insertions [xxx\n,yyy], those don't merge,
  // but if we get [xxx\n,yyy,zzz\n], that merges to [xxx\nyyyzzz\n].
  // This variable stores the length of yyy and any other newline-less
  // ops immediately after it.
  let bufOpAdditionalCharsAfterNewline = 0;

  /**
   * @param {boolean} [isEndDocument]
   */
  const flush = (isEndDocument) => {
    if (!bufOp.opcode) return;
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
  };

  const append = (op) => {
    if (op.chars <= 0) return;
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
      copyOp(op, bufOp);
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
    clearOp(bufOp);
  };
  return {
    append,
    toString,
    clear,
    endDocument,
  };
};

/**
 * @returns {OpAssembler}
 */
exports.opAssembler = () => {
  let serialized = '';

  /**
   * @param {Op} op - Operation to add. Ownership remains with the caller.
   */
  const append = (op) => {
    assert(op instanceof Op, 'argument must be an instance of Op');
    serialized += op.toString();
  };

  const toString = () => serialized;

  const clear = () => {
    serialized = '';
  };
  return {
    append,
    toString,
    clear,
  };
};

/**
 * A custom made String Iterator
 *
 * @typedef {object} StringIterator
 * @property {Function} newlines -
 * @property {Function} peek -
 * @property {Function} remaining -
 * @property {Function} skip -
 * @property {Function} take -
 */

/**
 * @param {string} str - String to iterate over
 * @returns {StringIterator}
 */
exports.stringIterator = (str) => {
  let curIndex = 0;
  // newLines is the number of \n between curIndex and str.length
  let newLines = str.split('\n').length - 1;
  const getnewLines = () => newLines;

  const assertRemaining = (n) => {
    assert(n <= remaining(), `!(${n} <= ${remaining()})`);
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
 *
 * @typedef {object} StringAssembler
 * @property {Function} append -
 * @property {Function} toString -
 */

/**
 * @returns {StringAssembler}
 */
exports.stringAssembler = () => ({
  _str: '',
  clear() { this._str = ''; },
  /**
   * @param {string} x -
   */
  append(x) { this._str += String(x); },
  toString() { return this._str; },
});

/**
 * @typedef {object} StringArrayLike
 * @property {(i: number) => string} get - Returns the line at index `i`.
 * @property {(number|(() => number))} length - The number of lines, or a method that returns the
 *     number of lines.
 * @property {(((start?: number, end?: number) => string[])|undefined)} slice - Like
 *     `Array.prototype.slice()`. Optional if the return value of the `removeLines` method is not
 *     needed.
 * @property {(i: number, d?: number, ...l: string[]) => any} splice - Like
 *     `Array.prototype.splice()`.
 */

/**
 * Class to iterate and modify texts which have several lines. It is used for applying Changesets on
 * arrays of lines.
 *
 * Mutation operations have the same constraints as exports operations with respect to newlines, but
 * not the other additional constraints (i.e. ins/del ordering, forbidden no-ops, non-mergeability,
 * final newline). Can be used to mutate lists of strings where the last char of each string is not
 * actually a newline, but for the purposes of N and L values, the caller should pretend it is, and
 * for things to work right in that case, the input to the `insert` method should be a single line
 * with no newlines.
 */
class TextLinesMutator {
  /**
   * @param {(string[]|StringArrayLike)} lines - Lines to mutate (in place).
   */
  constructor(lines) {
    this._lines = lines;
    /**
     * this._curSplice holds values that will be passed as arguments to this._lines.splice() to
     * insert, delete, or change lines:
     *   - this._curSplice[0] is an index into the this._lines array.
     *   - this._curSplice[1] is the number of lines that will be removed from the this._lines array
     *     starting at the index.
     *   - The other elements represent mutated (changed by ops) lines or new lines (added by ops)
     *     to insert at the index.
     *
     * @type {[number, number?, ...string[]?]}
     */
    this._curSplice = [0, 0];
    this._inSplice = false;
    // position in lines after curSplice is applied:
    this._curLine = 0;
    this._curCol = 0;
    // invariant: if (inSplice) then (curLine is in curSplice[0] + curSplice.length - {2,3}) &&
    //            curLine >= curSplice[0]
    // invariant: if (inSplice && (curLine >= curSplice[0] + curSplice.length - 2)) then
    //            curCol == 0
  }

  /**
   * Get a line from `lines` at given index.
   *
   * @param {number} idx - an index
   * @returns {string}
   */
  _linesGet(idx) {
    if ('get' in this._lines) {
      return this._lines.get(idx);
    } else {
      return this._lines[idx];
    }
  }

  /**
   * Return a slice from `lines`.
   *
   * @param {number} start - the start index
   * @param {number} end - the end index
   * @returns {string[]}
   */
  _linesSlice(start, end) {
    // can be unimplemented if removeLines's return value not needed
    if (this._lines.slice) {
      return this._lines.slice(start, end);
    } else {
      return [];
    }
  }

  /**
   * Return the length of `lines`.
   *
   * @returns {number}
   */
  _linesLength() {
    if (typeof this._lines.length === 'number') {
      return this._lines.length;
    } else {
      return this._lines.length();
    }
  }

  /**
   * Starts a new splice.
   */
  _enterSplice() {
    this._curSplice[0] = this._curLine;
    this._curSplice[1] = 0;
    // TODO(doc) when is this the case?
    //           check all enterSplice calls and changes to curCol
    if (this._curCol > 0) this._putCurLineInSplice();
    this._inSplice = true;
  }

  /**
   * Changes the lines array according to the values in curSplice and resets curSplice. Called via
   * close or TODO(doc).
   */
  _leaveSplice() {
    this._lines.splice(...this._curSplice);
    this._curSplice.length = 2;
    this._curSplice[0] = this._curSplice[1] = 0;
    this._inSplice = false;
  }

  /**
   * Indicates if curLine is already in the splice. This is necessary because the last element in
   * curSplice is curLine when this line is currently worked on (e.g. when skipping or inserting).
   *
   * @returns {boolean} true if curLine is in splice
   */
  _isCurLineInSplice() {
    // The value of `this._curSplice[1]` does not matter when determining the return value because
    // `this._curLine` refers to the line number *after* the splice is applied (so after those lines
    // are deleted).
    return this._curLine - this._curSplice[0] < this._curSplice.length - 2;
  }

  /**
   * Incorporates current line into the splice and marks its old position to be deleted.
   *
   * @returns {number} the index of the added line in curSplice
   */
  _putCurLineInSplice() {
    if (!this._isCurLineInSplice()) {
      this._curSplice.push(this._linesGet(this._curSplice[0] + this._curSplice[1]));
      this._curSplice[1]++;
    }
    // TODO should be the same as this._curSplice.length - 1
    return 2 + this._curLine - this._curSplice[0];
  }

  /**
   * It will skip some newlines by putting them into the splice.
   *
   * @param {number} L -
   * @param {boolean} includeInSplice - Indicates that attributes are present.
   */
  skipLines(L, includeInSplice) {
    if (!L) return;
    if (includeInSplice) {
      if (!this._inSplice) this._enterSplice();
      // TODO(doc) should this count the number of characters that are skipped to check?
      for (let i = 0; i < L; i++) {
        this._curCol = 0;
        this._putCurLineInSplice();
        this._curLine++;
      }
    } else {
      if (this._inSplice) {
        if (L > 1) {
          // TODO(doc) figure out why single lines are incorporated into splice instead of ignored
          this._leaveSplice();
        } else {
          this._putCurLineInSplice();
        }
      }
      this._curLine += L;
      this._curCol = 0;
    }
    // tests case foo in remove(), which isn't otherwise covered in current impl
  }

  /**
   * Skip some characters. Can contain newlines.
   *
   * @param {number} N - number of characters to skip
   * @param {number} L - number of newlines to skip
   * @param {boolean} includeInSplice - indicates if attributes are present
   */
  skip(N, L, includeInSplice) {
    if (!N) return;
    if (L) {
      this.skipLines(L, includeInSplice);
    } else {
      if (includeInSplice && !this._inSplice) this._enterSplice();
      if (this._inSplice) {
        // although the line is put into splice curLine is not increased, because
        // only some chars are skipped, not the whole line
        this._putCurLineInSplice();
      }
      this._curCol += N;
    }
  }

  /**
   * Remove whole lines from lines array.
   *
   * @param {number} L - number of lines to remove
   * @returns {string}
   */
  removeLines(L) {
    if (!L) return '';
    if (!this._inSplice) this._enterSplice();

    /**
     * Gets a string of joined lines after the end of the splice.
     *
     * @param {number} k - number of lines
     * @returns {string} joined lines
     */
    const nextKLinesText = (k) => {
      const m = this._curSplice[0] + this._curSplice[1];
      return this._linesSlice(m, m + k).join('');
    };

    let removed = '';
    if (this._isCurLineInSplice()) {
      if (this._curCol === 0) {
        removed = this._curSplice[this._curSplice.length - 1];
        this._curSplice.length--;
        removed += nextKLinesText(L - 1);
        this._curSplice[1] += L - 1;
      } else {
        removed = nextKLinesText(L - 1);
        this._curSplice[1] += L - 1;
        const sline = this._curSplice.length - 1;
        removed = this._curSplice[sline].substring(this._curCol) + removed;
        this._curSplice[sline] = this._curSplice[sline].substring(0, this._curCol) +
            this._linesGet(this._curSplice[0] + this._curSplice[1]);
        this._curSplice[1] += 1;
      }
    } else {
      removed = nextKLinesText(L);
      this._curSplice[1] += L;
    }
    return removed;
  }

  /**
   * Remove text from lines array.
   *
   * @param {number} N - characters to delete
   * @param {number} L - lines to delete
   * @returns {string}
   */
  remove(N, L) {
    if (!N) return '';
    if (L) return this.removeLines(L);
    if (!this._inSplice) this._enterSplice();
    // although the line is put into splice, curLine is not increased, because
    // only some chars are removed not the whole line
    const sline = this._putCurLineInSplice();
    const removed = this._curSplice[sline].substring(this._curCol, this._curCol + N);
    this._curSplice[sline] = this._curSplice[sline].substring(0, this._curCol) +
        this._curSplice[sline].substring(this._curCol + N);
    return removed;
  }

  /**
   * Inserts text into lines array.
   *
   * @param {string} text - the text to insert
   * @param {number} L - number of newlines in text
   */
  insert(text, L) {
    if (!text) return;
    if (!this._inSplice) this._enterSplice();
    if (L) {
      const newLines = exports.splitTextLines(text);
      if (this._isCurLineInSplice()) {
        const sline = this._curSplice.length - 1;
        /** @type {string} */
        const theLine = this._curSplice[sline];
        const lineCol = this._curCol;
        // Insert the chars up to `curCol` and the first new line.
        this._curSplice[sline] = theLine.substring(0, lineCol) + newLines[0];
        this._curLine++;
        newLines.splice(0, 1);
        // insert the remaining new lines
        this._curSplice.push(...newLines);
        this._curLine += newLines.length;
        // insert the remaining chars from the "old" line (e.g. the line we were in
        // when we started to insert new lines)
        this._curSplice.push(theLine.substring(lineCol));
        this._curCol = 0; // TODO(doc) why is this not set to the length of last line?
      } else {
        this._curSplice.push(...newLines);
        this._curLine += newLines.length;
      }
    } else {
      // There are no additional lines. Although the line is put into splice, curLine is not
      // increased because there may be more chars in the line (newline is not reached).
      const sline = this._putCurLineInSplice();
      if (!this._curSplice[sline]) {
        const err = new Error(
            'curSplice[sline] not populated, actual curSplice contents is ' +
            `${JSON.stringify(this._curSplice)}. Possibly related to ` +
            'https://github.com/ether/etherpad-lite/issues/2802');
        console.error(err.stack || err.toString());
      }
      this._curSplice[sline] = this._curSplice[sline].substring(0, this._curCol) + text +
          this._curSplice[sline].substring(this._curCol);
      this._curCol += text.length;
    }
  }

  /**
   * Checks if curLine (the line we are in when curSplice is applied) is the last line in `lines`.
   *
   * @returns {boolean} indicates if there are lines left
   */
  hasMore() {
    let docLines = this._linesLength();
    if (this._inSplice) {
      docLines += this._curSplice.length - 2 - this._curSplice[1];
    }
    return this._curLine < docLines;
  }

  /**
   * Closes the splice
   */
  close() {
    if (this._inSplice) this._leaveSplice();
  }
}

/**
 * Apply operations to other operations.
 *
 * @param {string} in1 - first Op string
 * @param {string} in2 - second Op string
 * @param {Function} func - Callback that applies an operation to another operation. Will be called
 *     multiple times depending on the number of operations in `in1` and `in2`. `func` has signature
 *     `opOut = f(op1, op2)`:
 *       - `op1` is the current operation from `in1`. `func` is expected to mutate `op1` to
 *         partially or fully consume it, and MUST set `op1.opcode` to the empty string once `op1`
 *         is fully consumed. If `op1` is not fully consumed, `func` will be called again with the
 *         same `op1` value. If `op1` is fully consumed, the next call to `func` will be given the
 *         next operation from `in1`. If there are no more operations in `in1`, `op1.opcode` will be
 *         the empty string.
 *       - `op2` is the current operation from `in2`, to apply to `op1`. Has the same consumption
 *         and advancement semantics as `op1`.
 *       - `opOut` is the result of applying `op2` (before consumption) to `op1` (before
 *         consumption). If there is no result (perhaps `op1` and `op2` cancelled each other out),
 *         either `opOut` must be nullish or `opOut.opcode` must be the empty string.
 * @returns {string} the integrated changeset
 */
const applyZip = (in1, in2, func) => {
  const ops1 = exports.deserializeOps(in1);
  const ops2 = exports.deserializeOps(in2);
  let next1 = ops1.next();
  let next2 = ops2.next();
  const assem = exports.smartOpAssembler();
  while (!next1.done || !next2.done) {
    if (!next1.done && !next1.value.opcode) next1 = ops1.next();
    if (!next2.done && !next2.value.opcode) next2 = ops2.next();
    if (next1.value == null) next1.value = new Op();
    if (next2.value == null) next2.value = new Op();
    if (!next1.value.opcode && !next2.value.opcode) break;
    const opOut = func(next1.value, next2.value);
    if (opOut && opOut.opcode) assem.append(opOut);
  }
  assem.endDocument();
  return assem.toString();
};

/**
 * Parses an encoded changeset.
 *
 * @param {string} cs - The encoded changeset.
 * @returns {Changeset}
 */
exports.unpack = (cs) => {
  const headerRegex = /Z:([0-9a-z]+)([><])([0-9a-z]+)|/;
  const headerMatch = headerRegex.exec(cs);
  if ((!headerMatch) || (!headerMatch[0])) error(`Not a changeset: ${cs}`);
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
 * Creates an encoded changeset.
 *
 * @param {number} oldLen - The length of the document before applying the changeset.
 * @param {number} newLen - The length of the document after applying the changeset.
 * @param {string} opsStr - Encoded operations to apply to the document.
 * @param {string} bank - Characters for insert operations.
 * @returns {string} The encoded changeset.
 */
exports.pack = (oldLen, newLen, opsStr, bank) => {
  const lenDiff = newLen - oldLen;
  const lenDiffStr = (lenDiff >= 0 ? `>${exports.numToString(lenDiff)}`
    : `<${exports.numToString(-lenDiff)}`);
  const a = [];
  a.push('Z:', exports.numToString(oldLen), lenDiffStr, opsStr, '$', bank);
  return a.join('');
};

/**
 * Applies a Changeset to a string.
 *
 * @param {string} cs - String encoded Changeset
 * @param {string} str - String to which a Changeset should be applied
 * @returns {string}
 */
exports.applyToText = (cs, str) => {
  const unpacked = exports.unpack(cs);
  assert(str.length === unpacked.oldLen, `mismatched apply: ${str.length} / ${unpacked.oldLen}`);
  const bankIter = exports.stringIterator(unpacked.charBank);
  const strIter = exports.stringIterator(str);
  const assem = exports.stringAssembler();
  for (const op of exports.deserializeOps(unpacked.ops)) {
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
 * Applies a changeset on an array of lines.
 *
 * @param {string} cs - the changeset to apply
 * @param {string[]} lines - The lines to which the changeset needs to be applied
 */
exports.mutateTextLines = (cs, lines) => {
  const unpacked = exports.unpack(cs);
  const bankIter = exports.stringIterator(unpacked.charBank);
  const mut = new TextLinesMutator(lines);
  for (const op of exports.deserializeOps(unpacked.ops)) {
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
 *
 * @param {AttributeString} att1 - first attribute string
 * @param {AttributeString} att2 - second attribue string
 * @param {boolean} resultIsMutation -
 * @param {AttributePool} pool - attribute pool
 * @returns {string}
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
  return AttributeMap.fromString(att1, pool).updateFromString(att2, !resultIsMutation).toString();
};

/**
 * Function used as parameter for applyZip to apply a Changeset to an attribute.
 *
 * @param {Op} attOp - The op from the sequence that is being operated on, either an attribution
 *     string or the earlier of two exportss being composed.
 * @param {Op} csOp -
 * @param {AttributePool} pool - Can be null if definitely not needed.
 * @returns {Op} The result of applying `csOp` to `attOp`.
 */
const slicerZipperFunc = (attOp, csOp, pool) => {
  const opOut = new Op();
  if (!attOp.opcode) {
    copyOp(csOp, opOut);
    csOp.opcode = '';
  } else if (!csOp.opcode) {
    copyOp(attOp, opOut);
    attOp.opcode = '';
  } else if (attOp.opcode === '-') {
    copyOp(attOp, opOut);
    attOp.opcode = '';
  } else if (csOp.opcode === '+') {
    copyOp(csOp, opOut);
    csOp.opcode = '';
  } else {
    for (const op of [attOp, csOp]) {
      assert(op.chars >= op.lines, `op has more newlines than chars: ${op.toString()}`);
    }
    assert(
        attOp.chars < csOp.chars ? attOp.lines <= csOp.lines
        : attOp.chars > csOp.chars ? attOp.lines >= csOp.lines
        : attOp.lines === csOp.lines,
        'line count mismatch when composing changesets A*B; ' +
        `opA: ${attOp.toString()} opB: ${csOp.toString()}`);
    assert(['+', '='].includes(attOp.opcode), `unexpected opcode in op: ${attOp.toString()}`);
    assert(['-', '='].includes(csOp.opcode), `unexpected opcode in op: ${csOp.toString()}`);
    opOut.opcode = {
      '+': {
        '-': '', // The '-' cancels out (some of) the '+', leaving any remainder for the next call.
        '=': '+',
      },
      '=': {
        '-': '-',
        '=': '=',
      },
    }[attOp.opcode][csOp.opcode];
    const [fullyConsumedOp, partiallyConsumedOp] = [attOp, csOp].sort((a, b) => a.chars - b.chars);
    opOut.chars = fullyConsumedOp.chars;
    opOut.lines = fullyConsumedOp.lines;
    opOut.attribs = csOp.opcode === '-'
      // csOp is a remove op and remove ops normally never have any attributes, so this should
      // normally be the empty string. However, padDiff.js adds attributes to remove ops and needs
      // them preserved so they are copied here.
      ? csOp.attribs
      : exports.composeAttributes(attOp.attribs, csOp.attribs, attOp.opcode === '=', pool);
    partiallyConsumedOp.chars -= fullyConsumedOp.chars;
    partiallyConsumedOp.lines -= fullyConsumedOp.lines;
    if (!partiallyConsumedOp.chars) partiallyConsumedOp.opcode = '';
    fullyConsumedOp.opcode = '';
  }
  return opOut;
};

/**
 * Applies a Changeset to the attribs string of a AText.
 *
 * @param {string} cs - Changeset
 * @param {string} astr - the attribs string of a AText
 * @param {AttributePool} pool - the attibutes pool
 * @returns {string}
 */
exports.applyToAttribution = (cs, astr, pool) => {
  const unpacked = exports.unpack(cs);
  return applyZip(astr, unpacked.ops, (op1, op2) => slicerZipperFunc(op1, op2, pool));
};

/**
 * Applies a changeset to an array of attribute lines.
 *
 * @param {string} cs - The encoded changeset.
 * @param {Array<string>} lines - Attribute lines. Modified in place.
 * @param {AttributePool} pool - Attribute pool.
 */
exports.mutateAttributionLines = (cs, lines, pool) => {
  const unpacked = exports.unpack(cs);
  const csOps = exports.deserializeOps(unpacked.ops);
  let csOpsNext = csOps.next();
  const csBank = unpacked.charBank;
  let csBankIndex = 0;
  // treat the attribution lines as text lines, mutating a line at a time
  const mut = new TextLinesMutator(lines);

  /**
   * The Ops in the current line from `lines`.
   *
   * @type {?Generator<Op>}
   */
  let lineOps = null;
  let lineOpsNext = null;

  const lineOpsHasNext = () => lineOpsNext && !lineOpsNext.done;
  /**
   * Returns false if we are on the last attribute line in `lines` and there is no additional op in
   * that line.
   *
   * @returns {boolean} True if there are more ops to go through.
   */
  const isNextMutOp = () => lineOpsHasNext() || mut.hasMore();

  /**
   * @returns {Op} The next Op from `lineIter`. If there are no more Ops, `lineIter` is reset to
   *     iterate over the next line, which is consumed from `mut`. If there are no more lines,
   *     returns a null Op.
   */
  const nextMutOp = () => {
    if (!lineOpsHasNext() && mut.hasMore()) {
      // There are more attribute lines in `lines` to do AND either we just started so `lineIter` is
      // still null or there are no more ops in current `lineIter`.
      const line = mut.removeLines(1);
      lineOps = exports.deserializeOps(line);
      lineOpsNext = lineOps.next();
    }
    if (!lineOpsHasNext()) return new Op(); // No more ops and no more lines.
    const op = lineOpsNext.value;
    lineOpsNext = lineOps.next();
    return op;
  };
  let lineAssem = null;

  /**
   * Appends an op to `lineAssem`. In case `lineAssem` includes one single newline, adds it to the
   * `lines` mutator.
   */
  const outputMutOp = (op) => {
    if (!lineAssem) {
      lineAssem = exports.mergingOpAssembler();
    }
    lineAssem.append(op);
    if (op.lines <= 0) return;
    assert(op.lines === 1, `Can't have op.lines of ${op.lines} in attribution lines`);
    // ship it to the mut
    mut.insert(lineAssem.toString(), 1);
    lineAssem = null;
  };

  let csOp = new Op();
  let attOp = new Op();
  while (csOp.opcode || !csOpsNext.done || attOp.opcode || isNextMutOp()) {
    if (!csOp.opcode && !csOpsNext.done) {
      // coOp done, but more ops in cs.
      csOp = csOpsNext.value;
      csOpsNext = csOps.next();
    }
    if (!csOp.opcode && !attOp.opcode && !lineAssem && !lineOpsHasNext()) {
      break; // done
    } else if (csOp.opcode === '=' && csOp.lines > 0 && !csOp.attribs && !attOp.opcode &&
               !lineAssem && !lineOpsHasNext()) {
      // Skip multiple lines without attributes; this is what makes small changes not order of the
      // document size.
      mut.skipLines(csOp.lines);
      csOp.opcode = '';
    } else if (csOp.opcode === '+') {
      const opOut = copyOp(csOp);
      if (csOp.lines > 1) {
        // Copy the first line from `csOp` to `opOut`.
        const firstLineLen = csBank.indexOf('\n', csBankIndex) + 1 - csBankIndex;
        csOp.chars -= firstLineLen;
        csOp.lines--;
        opOut.lines = 1;
        opOut.chars = firstLineLen;
      } else {
        // Either one or no newlines in '+' `csOp`, copy to `opOut` and reset `csOp`.
        csOp.opcode = '';
      }
      outputMutOp(opOut);
      csBankIndex += opOut.chars;
    } else {
      if (!attOp.opcode && isNextMutOp()) attOp = nextMutOp();
      const opOut = slicerZipperFunc(attOp, csOp, pool);
      if (opOut.opcode) outputMutOp(opOut);
    }
  }

  assert(!lineAssem, `line assembler not finished:${cs}`);
  mut.close();
};

/**
 * Joins several Attribution lines.
 *
 * @param {string[]} theAlines - collection of Attribution lines
 * @returns {string} joined Attribution lines
 */
exports.joinAttributionLines = (theAlines) => {
  const assem = exports.mergingOpAssembler();
  for (const aline of theAlines) {
    for (const op of exports.deserializeOps(aline)) assem.append(op);
  }
  return assem.toString();
};

exports.splitAttributionLines = (attrOps, text) => {
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

  for (const op of exports.deserializeOps(attrOps)) {
    let numChars = op.chars;
    let numLines = op.lines;
    while (numLines > 1) {
      const newlineEnd = text.indexOf('\n', pos) + 1;
      assert(newlineEnd > 0, 'newlineEnd <= 0 in splitAttributionLines');
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
 * Splits text into lines.
 *
 * @param {string} text - text to split
 * @returns {string[]}
 */
exports.splitTextLines = (text) => text.match(/[^\n]*(?:\n|[^\n]$)/g);

/**
 * Compose two Changesets.
 *
 * @param {string} cs1 - first Changeset
 * @param {string} cs2 - second Changeset
 * @param {AttributePool} pool - Attribs pool
 * @returns {string}
 */
exports.compose = (cs1, cs2, pool) => {
  const unpacked1 = exports.unpack(cs1);
  const unpacked2 = exports.unpack(cs2);
  const len1 = unpacked1.oldLen;
  const len2 = unpacked1.newLen;
  assert(len2 === unpacked2.oldLen, 'mismatched composition of two changesets');
  const len3 = unpacked2.newLen;
  const bankIter1 = exports.stringIterator(unpacked1.charBank);
  const bankIter2 = exports.stringIterator(unpacked2.charBank);
  const bankAssem = exports.stringAssembler();

  const newOps = applyZip(unpacked1.ops, unpacked2.ops, (op1, op2) => {
    const op1code = op1.opcode;
    const op2code = op2.opcode;
    if (op1code === '+' && op2code === '-') {
      bankIter1.skip(Math.min(op1.chars, op2.chars));
    }
    const opOut = slicerZipperFunc(op1, op2, pool);
    if (opOut.opcode === '+') {
      if (op2code === '+') {
        bankAssem.append(bankIter2.take(opOut.chars));
      } else {
        bankAssem.append(bankIter1.take(opOut.chars));
      }
    }
    return opOut;
  });

  return exports.pack(len1, len3, newOps, bankAssem.toString());
};

/**
 * Returns a function that tests if a string of attributes (e.g. '*3*4') contains a given attribute
 * key,value that is already present in the pool.
 *
 * @param {Attribute} attribPair - `[key, value]` pair of strings.
 * @param {AttributePool} pool - Attribute pool
 * @returns {Function}
 */
exports.attributeTester = (attribPair, pool) => {
  const never = (attribs) => false;
  if (!pool) return never;
  const attribNum = pool.putAttrib(attribPair, true);
  if (attribNum < 0) return never;
  const re = new RegExp(`\\*${exports.numToString(attribNum)}(?!\\w)`);
  return (attribs) => re.test(attribs);
};

/**
 * Creates the identity Changeset of length N.
 *
 * @param {number} N - length of the identity changeset
 * @returns {string}
 */
exports.identity = (N) => exports.pack(N, N, '', '');

/**
 * Creates a Changeset which works on oldFullText and removes text from spliceStart to
 * spliceStart+numRemoved and inserts newText instead. Also gives possibility to add attributes
 * optNewTextAPairs for the new text.
 *
 * @param {string} orig - Original text.
 * @param {number} start - Index into `orig` where characters should be removed and inserted.
 * @param {number} ndel - Number of characters to delete at `start`.
 * @param {string} ins - Text to insert at `start` (after deleting `ndel` characters).
 * @param {string} [attribs] - Optional attributes to apply to the inserted text.
 * @param {AttributePool} [pool] - Attribute pool.
 * @returns {string}
 */
exports.makeSplice = (orig, start, ndel, ins, attribs, pool) => {
  if (start < 0) throw new RangeError(`start index must be non-negative (is ${start})`);
  if (ndel < 0) throw new RangeError(`characters to delete must be non-negative (is ${ndel})`);
  if (start > orig.length) start = orig.length;
  if (ndel > orig.length - start) ndel = orig.length - start;
  const deleted = orig.substring(start, start + ndel);
  const assem = exports.smartOpAssembler();
  const ops = (function* () {
    yield* opsFromText('=', orig.substring(0, start));
    yield* opsFromText('-', deleted);
    yield* opsFromText('+', ins, attribs, pool);
  })();
  for (const op of ops) assem.append(op);
  assem.endDocument();
  return exports.pack(orig.length, orig.length + ins.length - ndel, assem.toString(), ins);
};

/**
 * Transforms a changeset into a list of splices in the form [startChar, endChar, newText] meaning
 * replace text from startChar to endChar with newText.
 *
 * @param {string} cs - Changeset
 * @returns {[number, number, string][]}
 */
const toSplices = (cs) => {
  const unpacked = exports.unpack(cs);
  /** @type {[number, number, string][]} */
  const splices = [];

  let oldPos = 0;
  const charIter = exports.stringIterator(unpacked.charBank);
  let inSplice = false;
  for (const op of exports.deserializeOps(unpacked.ops)) {
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
 * @param {string} cs -
 * @param {number} startChar -
 * @param {number} endChar -
 * @param {number} insertionsAfter -
 * @returns {[number, number]}
 */
exports.characterRangeFollow = (cs, startChar, endChar, insertionsAfter) => {
  let newStartChar = startChar;
  let newEndChar = endChar;
  let lengthChangeSoFar = 0;
  for (const splice of toSplices(cs)) {
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
 * Iterate over attributes in a changeset and move them from oldPool to newPool.
 *
 * @param {string} cs - Chageset/attribution string to iterate over
 * @param {AttributePool} oldPool - old attributes pool
 * @param {AttributePool} newPool - new attributes pool
 * @returns {string} the new Changeset
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
    const pair = oldPool.getAttrib(oldNum);
    // The attribute might not be in the old pool if the user is viewing the current revision in the
    // timeslider and text is deleted. See: https://github.com/ether/etherpad-lite/issues/3932
    if (!pair) return '';
    const newNum = newPool.putAttrib(pair);
    return `*${exports.numToString(newNum)}`;
  }) + fromDollar;
};

/**
 * Create an attribution inserting a text.
 *
 * @param {string} text - text to insert
 * @returns {string}
 */
exports.makeAttribution = (text) => {
  const assem = exports.smartOpAssembler();
  for (const op of opsFromText('+', text)) assem.append(op);
  return assem.toString();
};

/**
 * Iterates over attributes in exports, attribution string, or attribs property of an op and runs
 * function func on them.
 *
 * @deprecated Use `attributes.decodeAttribString()` instead.
 * @param {string} cs - changeset
 * @param {Function} func - function to call
 */
exports.eachAttribNumber = (cs, func) => {
  padutils.warnDeprecated(
      'Changeset.eachAttribNumber() is deprecated; use attributes.decodeAttribString() instead');
  let dollarPos = cs.indexOf('$');
  if (dollarPos < 0) {
    dollarPos = cs.length;
  }
  const upToDollar = cs.substring(0, dollarPos);

  // WARNING: The following cannot be replaced with a call to `attributes.decodeAttribString()`
  // because that function only works on attribute strings, not serialized operations or changesets.
  upToDollar.replace(/\*([0-9a-z]+)/g, (_, a) => {
    func(exports.parseNum(a));
    return '';
  });
};

/**
 * Filter attributes which should remain in a Changeset. Callable on a exports, attribution string,
 * or attribs property of an op, though it may easily create adjacent ops that can be merged.
 *
 * @param {string} cs - changeset to filter
 * @param {Function} filter - fnc which returns true if an attribute X (int) should be kept in the
 *     Changeset
 * @returns {string}
 */
exports.filterAttribNumbers = (cs, filter) => exports.mapAttribNumbers(cs, filter);

/**
 * Does exactly the same as exports.filterAttribNumbers.
 *
 * @param {string} cs -
 * @param {Function} func -
 * @returns {string}
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
 * Represents text with attributes.
 *
 * @typedef {object} AText
 * @property {string} attribs - Serialized sequence of insert operations that cover the text in
 *     `text`. These operations describe which parts of the text have what attributes.
 * @property {string} text - The text.
 */

/**
 * Create a Changeset going from Identity to a certain state.
 *
 * @param {string} text - text of the final change
 * @param {string} attribs - optional, operations which insert the text and also puts the right
 *     attributes
 * @returns {AText}
 */
exports.makeAText = (text, attribs) => ({
  text,
  attribs: (attribs || exports.makeAttribution(text)),
});

/**
 * Apply a Changeset to a AText.
 *
 * @param {string} cs - Changeset to apply
 * @param {AText} atext -
 * @param {AttributePool} pool - Attribute Pool to add to
 * @returns {AText}
 */
exports.applyToAText = (cs, atext, pool) => ({
  text: exports.applyToText(cs, atext.text),
  attribs: exports.applyToAttribution(cs, atext.attribs, pool),
});

/**
 * Clones a AText structure.
 *
 * @param {AText} atext -
 * @returns {AText}
 */
exports.cloneAText = (atext) => {
  if (!atext) error('atext is null');
  return {
    text: atext.text,
    attribs: atext.attribs,
  };
};

/**
 * Copies a AText structure from atext1 to atext2.
 *
 * @param {AText} atext1 -
 * @param {AText} atext2 -
 */
exports.copyAText = (atext1, atext2) => {
  atext2.text = atext1.text;
  atext2.attribs = atext1.attribs;
};

/**
 * Convert AText to a series of operations. Strips final newline.
 *
 * @param {AText} atext - The AText to convert.
 * @yields {Op}
 * @returns {Generator<Op>}
 */
exports.opsFromAText = function* (atext) {
  // intentionally skips last newline char of atext
  let lastOp = null;
  for (const op of exports.deserializeOps(atext.attribs)) {
    if (lastOp != null) yield lastOp;
    lastOp = op;
  }
  if (lastOp == null) return;
  // exclude final newline
  if (lastOp.lines <= 1) {
    lastOp.lines = 0;
    lastOp.chars--;
  } else {
    const nextToLastNewlineEnd = atext.text.lastIndexOf('\n', atext.text.length - 2) + 1;
    const lastLineLength = atext.text.length - nextToLastNewlineEnd - 1;
    lastOp.lines--;
    lastOp.chars -= (lastLineLength + 1);
    yield copyOp(lastOp);
    lastOp.lines = 0;
    lastOp.chars = lastLineLength;
  }
  if (lastOp.chars) yield lastOp;
};

/**
 * Append the set of operations from atext to an assembler.
 *
 * @deprecated Use `opsFromAText` instead.
 * @param {AText} atext -
 * @param assem - Assembler like SmartOpAssembler TODO add desc
 */
exports.appendATextToAssembler = (atext, assem) => {
  padutils.warnDeprecated(
      'Changeset.appendATextToAssembler() is deprecated; use Changeset.opsFromAText() instead');
  for (const op of exports.opsFromAText(atext)) assem.append(op);
};

/**
 * Creates a clone of a Changeset and it's APool.
 *
 * @param {string} cs -
 * @param {AttributePool} pool -
 * @returns {{translated: string, pool: AttributePool}}
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
 * Checks if a changeset s the identity changeset.
 *
 * @param {string} cs -
 * @returns {boolean}
 */
exports.isIdentity = (cs) => {
  const unpacked = exports.unpack(cs);
  return unpacked.ops === '' && unpacked.oldLen === unpacked.newLen;
};

/**
 * @deprecated Use an AttributeMap instead.
 */
const attribsAttributeValue = (attribs, key, pool) => {
  if (!attribs) return '';
  for (const [k, v] of attributes.attribsFromString(attribs, pool)) {
    if (k === key) return v;
  }
  return '';
};

/**
 * Returns all the values of attributes with a certain key in an Op attribs string.
 *
 * @deprecated Use an AttributeMap instead.
 * @param {Op} op - Op
 * @param {string} key - string to search for
 * @param {AttributePool} pool - attribute pool
 * @returns {string}
 */
exports.opAttributeValue = (op, key, pool) => {
  padutils.warnDeprecated(
      'Changeset.opAttributeValue() is deprecated; use an AttributeMap instead');
  return attribsAttributeValue(op.attribs, key, pool);
};

/**
 * Returns all the values of attributes with a certain key in an attribs string.
 *
 * @deprecated Use an AttributeMap instead.
 * @param {AttributeString} attribs - Attribute string
 * @param {string} key - string to search for
 * @param {AttributePool} pool - attribute pool
 * @returns {string}
 */
exports.attribsAttributeValue = (attribs, key, pool) => {
  padutils.warnDeprecated(
      'Changeset.attribsAttributeValue() is deprecated; use an AttributeMap instead');
  return attribsAttributeValue(attribs, key, pool);
};

/**
 * Incrementally builds a Changeset.
 *
 * @typedef {object} Builder
 * @property {Function} insert -
 * @property {Function} keep -
 * @property {Function} keepText -
 * @property {Function} remove -
 * @property {Function} toString -
 */

/**
 * @param {number} oldLen - Old length
 * @returns {Builder}
 */
exports.builder = (oldLen) => {
  const assem = exports.smartOpAssembler();
  const o = new Op();
  const charBank = exports.stringAssembler();

  const self = {
    /**
     * @param {number} N - Number of characters to keep.
     * @param {number} L - Number of newlines among the `N` characters. If positive, the last
     *     character must be a newline.
     * @param {(string|Attribute[])} attribs - Either [[key1,value1],[key2,value2],...] or '*0*1...'
     *     (no pool needed in latter case).
     * @param {?AttributePool} pool - Attribute pool, only required if `attribs` is a list of
     *     attribute key, value pairs.
     * @returns {Builder} this
     */
    keep: (N, L, attribs, pool) => {
      o.opcode = '=';
      o.attribs = typeof attribs === 'string'
        ? attribs : new AttributeMap(pool).update(attribs || []).toString();
      o.chars = N;
      o.lines = (L || 0);
      assem.append(o);
      return self;
    },

    /**
     * @param {string} text - Text to keep.
     * @param {(string|Attribute[])} attribs - Either [[key1,value1],[key2,value2],...] or '*0*1...'
     *     (no pool needed in latter case).
     * @param {?AttributePool} pool - Attribute pool, only required if `attribs` is a list of
     *     attribute key, value pairs.
     * @returns {Builder} this
     */
    keepText: (text, attribs, pool) => {
      for (const op of opsFromText('=', text, attribs, pool)) assem.append(op);
      return self;
    },

    /**
     * @param {string} text - Text to insert.
     * @param {(string|Attribute[])} attribs - Either [[key1,value1],[key2,value2],...] or '*0*1...'
     *     (no pool needed in latter case).
     * @param {?AttributePool} pool - Attribute pool, only required if `attribs` is a list of
     *     attribute key, value pairs.
     * @returns {Builder} this
     */
    insert: (text, attribs, pool) => {
      for (const op of opsFromText('+', text, attribs, pool)) assem.append(op);
      charBank.append(text);
      return self;
    },

    /**
     * @param {number} N - Number of characters to remove.
     * @param {number} L - Number of newlines among the `N` characters. If positive, the last
     *     character must be a newline.
     * @returns {Builder} this
     */
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

/**
 * Constructs an attribute string from a sequence of attributes.
 *
 * @deprecated Use `AttributeMap.prototype.toString()` or `attributes.attribsToString()` instead.
 * @param {string} opcode - The opcode for the Op that will get the resulting attribute string.
 * @param {?(Iterable<Attribute>|AttributeString)} attribs - The attributes to insert into the pool
 *     (if necessary) and encode. If an attribute string, no checking is performed to ensure that
 *     the attributes exist in the pool, are in the canonical order, and contain no duplicate keys.
 *     If this is an iterable of attributes, `pool` must be non-null.
 * @param {AttributePool} pool - Attribute pool. Required if `attribs` is an iterable of attributes,
 *     ignored if `attribs` is an attribute string.
 * @returns {AttributeString}
 */
exports.makeAttribsString = (opcode, attribs, pool) => {
  padutils.warnDeprecated(
      'Changeset.makeAttribsString() is deprecated; ' +
      'use AttributeMap.prototype.toString() or attributes.attribsToString() instead');
  if (!attribs || !['=', '+'].includes(opcode)) return '';
  if (typeof attribs === 'string') return attribs;
  return new AttributeMap(pool).update(attribs, opcode === '+').toString();
};

/**
 * Like "substring" but on a single-line attribution string.
 */
exports.subattribution = (astr, start, optEnd) => {
  const attOps = exports.deserializeOps(astr);
  let attOpsNext = attOps.next();
  const assem = exports.smartOpAssembler();
  let attOp = new Op();
  const csOp = new Op();

  const doCsOp = () => {
    if (!csOp.chars) return;
    while (csOp.opcode && (attOp.opcode || !attOpsNext.done)) {
      if (!attOp.opcode) {
        attOp = attOpsNext.value;
        attOpsNext = attOps.next();
      }
      if (csOp.opcode && attOp.opcode && csOp.chars >= attOp.chars &&
          attOp.lines > 0 && csOp.lines <= 0) {
        csOp.lines++;
      }
      const opOut = slicerZipperFunc(attOp, csOp, null);
      if (opOut.opcode) assem.append(opOut);
    }
  };

  csOp.opcode = '-';
  csOp.chars = start;

  doCsOp();

  if (optEnd === undefined) {
    if (attOp.opcode) {
      assem.append(attOp);
    }
    while (!attOpsNext.done) {
      assem.append(attOpsNext.value);
      attOpsNext = attOps.next();
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

  const linesGet = (idx) => {
    if (lines.get) {
      return lines.get(idx);
    } else {
      return lines[idx];
    }
  };

  /**
   * @param {number} idx -
   * @returns {string}
   */
  const alinesGet = (idx) => {
    if (alines.get) {
      return alines.get(idx);
    } else {
      return alines[idx];
    }
  };

  let curLine = 0;
  let curChar = 0;
  let curLineOps = null;
  let curLineOpsNext = null;
  let curLineOpsLine;
  let curLineNextOp = new Op('+');

  const unpacked = exports.unpack(cs);
  const builder = exports.builder(unpacked.newLen);

  const consumeAttribRuns = (numChars, func /* (len, attribs, endsLine)*/) => {
    if (!curLineOps || curLineOpsLine !== curLine) {
      curLineOps = exports.deserializeOps(alinesGet(curLine));
      curLineOpsNext = curLineOps.next();
      curLineOpsLine = curLine;
      let indexIntoLine = 0;
      while (!curLineOpsNext.done) {
        curLineNextOp = curLineOpsNext.value;
        curLineOpsNext = curLineOps.next();
        if (indexIntoLine + curLineNextOp.chars >= curChar) {
          curLineNextOp.chars -= (curChar - indexIntoLine);
          break;
        }
        indexIntoLine += curLineNextOp.chars;
      }
    }

    while (numChars > 0) {
      if (!curLineNextOp.chars && curLineOpsNext.done) {
        curLine++;
        curChar = 0;
        curLineOpsLine = curLine;
        curLineNextOp.chars = 0;
        curLineOps = exports.deserializeOps(alinesGet(curLine));
        curLineOpsNext = curLineOps.next();
      }
      if (!curLineNextOp.chars) {
        if (curLineOpsNext.done) {
          curLineNextOp = new Op();
        } else {
          curLineNextOp = curLineOpsNext.value;
          curLineOpsNext = curLineOps.next();
        }
      }
      const charsToUse = Math.min(numChars, curLineNextOp.chars);
      func(charsToUse, curLineNextOp.attribs, charsToUse === curLineNextOp.chars &&
          curLineNextOp.lines > 0);
      numChars -= charsToUse;
      curLineNextOp.chars -= charsToUse;
      curChar += charsToUse;
    }

    if (!curLineNextOp.chars && curLineOpsNext.done) {
      curLine++;
      curChar = 0;
    }
  };

  const skip = (N, L) => {
    if (L) {
      curLine += L;
      curChar = 0;
    } else if (curLineOps && curLineOpsLine === curLine) {
      consumeAttribRuns(N, () => {});
    } else {
      curChar += N;
    }
  };

  const nextText = (numChars) => {
    let len = 0;
    const assem = exports.stringAssembler();
    const firstString = linesGet(curLine).substring(curChar);
    len += firstString.length;
    assem.append(firstString);

    let lineNum = curLine + 1;
    while (len < numChars) {
      const nextString = linesGet(lineNum);
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

  for (const csOp of exports.deserializeOps(unpacked.ops)) {
    if (csOp.opcode === '=') {
      if (csOp.attribs) {
        const attribs = AttributeMap.fromString(csOp.attribs, pool);
        const undoBackToAttribs = cachedStrFunc((oldAttribsStr) => {
          const oldAttribs = AttributeMap.fromString(oldAttribsStr, pool);
          const backAttribs = new AttributeMap(pool);
          for (const [key, value] of attribs) {
            const oldValue = oldAttribs.get(key) || '';
            if (oldValue !== value) backAttribs.set(key, oldValue);
          }
          // TODO: backAttribs does not restore removed attributes (it is missing attributes that
          // are in oldAttribs but not in attribs). I don't know if that is intentional.
          return backAttribs.toString();
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
  assert(len1 === len2, 'mismatched follow - cannot transform cs1 on top of cs2');
  const chars1 = exports.stringIterator(unpacked1.charBank);
  const chars2 = exports.stringIterator(unpacked2.charBank);

  const oldLen = unpacked1.newLen;
  let oldPos = 0;
  let newLen = 0;

  const hasInsertFirst = exports.attributeTester(['insertorder', 'first'], pool);

  const newOps = applyZip(unpacked1.ops, unpacked2.ops, (op1, op2) => {
    const opOut = new Op();
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
        copyOp(op2, opOut);
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
      copyOp(op2, opOut);
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
      copyOp(op2, opOut);
      op2.opcode = '';
    } else if (!op2.opcode) {
      // @NOTE: Critical bugfix for EPL issue #1625. We do not copy op1 here
      // in order to prevent attributes from leaking into result changesets.
      // copyOp(op1, opOut);
      op1.opcode = '';
    } else {
      // both keeps
      opOut.opcode = '=';
      opOut.attribs = followAttributes(op1.attribs, op2.attribs, pool);
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
    return opOut;
  });
  newLen += oldLen - oldPos;

  return exports.pack(oldLen, newLen, newOps, unpacked2.charBank);
};

const followAttributes = (att1, att2, pool) => {
  // The merge of two sets of attribute changes to the same text
  // takes the lexically-earlier value if there are two values
  // for the same key.  Otherwise, all key/value changes from
  // both attribute sets are taken.  This operation is the "follow",
  // so a set of changes is produced that can be applied to att1
  // to produce the merged set.
  if ((!att2) || (!pool)) return '';
  if (!att1) return att2;
  const atts = new Map();
  att2.replace(/\*([0-9a-z]+)/g, (_, a) => {
    const [key, val] = pool.getAttrib(exports.parseNum(a));
    atts.set(key, val);
    return '';
  });
  att1.replace(/\*([0-9a-z]+)/g, (_, a) => {
    const [key, val] = pool.getAttrib(exports.parseNum(a));
    if (atts.has(key) && val <= atts.get(key)) atts.delete(key);
    return '';
  });
  // we've only removed attributes, so they're already sorted
  const buf = exports.stringAssembler();
  for (const att of atts) {
    buf.append('*');
    buf.append(exports.numToString(pool.putAttrib(att)));
  }
  return buf.toString();
};

exports.exportedForTestingOnly = {
  TextLinesMutator,
  followAttributes,
  toSplices,
};
