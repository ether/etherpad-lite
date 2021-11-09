'use strict';
const Changeset = require('../../static/js/Changeset');
const exportHtml = require('./ExportHtml');

function PadDiff(pad, fromRev, toRev) {
  // check parameters
  if (!pad || !pad.id || !pad.atext || !pad.pool) {
    throw new Error('Invalid pad');
  }

  const range = pad.getValidRevisionRange(fromRev, toRev);
  if (!range) throw new Error(`Invalid revision range. startRev: ${fromRev} endRev: ${toRev}`);

  this._pad = pad;
  this._fromRev = range.startRev;
  this._toRev = range.endRev;
  this._html = null;
  this._authors = [];
}

PadDiff.prototype._isClearAuthorship = function (changeset) {
  // unpack
  const unpacked = Changeset.unpack(changeset);

  // check if there is nothing in the charBank
  if (unpacked.charBank !== '') {
    return false;
  }

  // check if oldLength == newLength
  if (unpacked.oldLen !== unpacked.newLen) {
    return false;
  }

  // lets iterator over the operators
  const iterator = Changeset.opIterator(unpacked.ops);

  // get the first operator, this should be a clear operator
  const clearOperator = iterator.next();

  // check if there is only one operator
  if (iterator.hasNext() === true) {
    return false;
  }

  // check if this operator doesn't change text
  if (clearOperator.opcode !== '=') {
    return false;
  }

  // check that this operator applys to the complete text
  // if the text ends with a new line, its exactly one character less, else it has the same length
  if (clearOperator.chars !== unpacked.oldLen - 1 && clearOperator.chars !== unpacked.oldLen) {
    return false;
  }

  const attributes = [];
  Changeset.eachAttribNumber(changeset, (attrNum) => {
    attributes.push(attrNum);
  });

  // check that this changeset uses only one attribute
  if (attributes.length !== 1) {
    return false;
  }

  const appliedAttribute = this._pad.pool.getAttrib(attributes[0]);

  // check if the applied attribute is an anonymous author attribute
  if (appliedAttribute[0] !== 'author' || appliedAttribute[1] !== '') {
    return false;
  }

  return true;
};

PadDiff.prototype._createClearAuthorship = async function (rev) {
  const atext = await this._pad.getInternalRevisionAText(rev);

  // build clearAuthorship changeset
  const builder = Changeset.builder(atext.text.length);
  builder.keepText(atext.text, [['author', '']], this._pad.pool);
  const changeset = builder.toString();

  return changeset;
};

PadDiff.prototype._createClearStartAtext = async function (rev) {
  // get the atext of this revision
  const atext = await this._pad.getInternalRevisionAText(rev);

  // create the clearAuthorship changeset
  const changeset = await this._createClearAuthorship(rev);

  // apply the clearAuthorship changeset
  const newAText = Changeset.applyToAText(changeset, atext, this._pad.pool);

  return newAText;
};

PadDiff.prototype._getChangesetsInBulk = async function (startRev, count) {
  // find out which revisions we need
  const revisions = [];
  for (let i = startRev; i < (startRev + count) && i <= this._pad.head; i++) {
    revisions.push(i);
  }

  // get all needed revisions (in parallel)
  const changesets = []; const
    authors = [];
  await Promise.all(revisions.map((rev) => this._pad.getRevision(rev).then((revision) => {
    const arrayNum = rev - startRev;
    changesets[arrayNum] = revision.changeset;
    authors[arrayNum] = revision.meta.author;
  })));

  return {changesets, authors};
};

PadDiff.prototype._addAuthors = function (authors) {
  const self = this;

  // add to array if not in the array
  authors.forEach((author) => {
    if (self._authors.indexOf(author) === -1) {
      self._authors.push(author);
    }
  });
};

PadDiff.prototype._createDiffAtext = async function () {
  const bulkSize = 100;

  // get the cleaned startAText
  let atext = await this._createClearStartAtext(this._fromRev);

  let superChangeset = null;

  for (let rev = this._fromRev + 1; rev <= this._toRev; rev += bulkSize) {
    // get the bulk
    const {changesets, authors} = await this._getChangesetsInBulk(rev, bulkSize);

    const addedAuthors = [];

    // run through all changesets
    for (let i = 0; i < changesets.length && (rev + i) <= this._toRev; ++i) {
      let changeset = changesets[i];

      // skip clearAuthorship Changesets
      if (this._isClearAuthorship(changeset)) {
        continue;
      }

      changeset = this._extendChangesetWithAuthor(changeset, authors[i], this._pad.pool);

      // add this author to the authorarray
      addedAuthors.push(authors[i]);

      // compose it with the superChangset
      if (superChangeset == null) {
        superChangeset = changeset;
      } else {
        superChangeset = Changeset.compose(superChangeset, changeset, this._pad.pool);
      }
    }

    // add the authors to the PadDiff authorArray
    this._addAuthors(addedAuthors);
  }

  // if there are only clearAuthorship changesets, we don't get a superChangeset,
  // so we can skip this step
  if (superChangeset) {
    const deletionChangeset = this._createDeletionChangeset(superChangeset, atext, this._pad.pool);

    // apply the superChangeset, which includes all addings
    atext = Changeset.applyToAText(superChangeset, atext, this._pad.pool);

    // apply the deletionChangeset, which adds a deletions
    atext = Changeset.applyToAText(deletionChangeset, atext, this._pad.pool);
  }

  return atext;
};

PadDiff.prototype.getHtml = async function () {
  // cache the html
  if (this._html != null) {
    return this._html;
  }

  // get the diff atext
  const atext = await this._createDiffAtext();

  // get the authorColor table
  const authorColors = await this._pad.getAllAuthorColors();

  // convert the atext to html
  this._html = await exportHtml.getHTMLFromAtext(this._pad, atext, authorColors);

  return this._html;
};

PadDiff.prototype.getAuthors = async function () {
  // check if html was already produced, if not produce it, this generates
  // the author array at the same time
  if (this._html == null) {
    await this.getHtml();
  }

  return self._authors;
};

PadDiff.prototype._extendChangesetWithAuthor = (changeset, author, apool) => {
  // unpack
  const unpacked = Changeset.unpack(changeset);

  const iterator = Changeset.opIterator(unpacked.ops);
  const assem = Changeset.opAssembler();

  // create deleted attribs
  const authorAttrib = apool.putAttrib(['author', author || '']);
  const deletedAttrib = apool.putAttrib(['removed', true]);
  const attribs = `*${Changeset.numToString(authorAttrib)}*${Changeset.numToString(deletedAttrib)}`;

  // iteratore over the operators of the changeset
  while (iterator.hasNext()) {
    const operator = iterator.next();

    if (operator.opcode === '-') {
      // this is a delete operator, extend it with the author
      operator.attribs = attribs;
    } else if (operator.opcode === '=' && operator.attribs) {
      // this is operator changes only attributes, let's mark which author did that
      operator.attribs += `*${Changeset.numToString(authorAttrib)}`;
    }

    // append the new operator to our assembler
    assem.append(operator);
  }

  // return the modified changeset
  return Changeset.pack(unpacked.oldLen, unpacked.newLen, assem.toString(), unpacked.charBank);
};

// this method is 80% like Changeset.inverse. I just changed so instead of reverting,
// it adds deletions and attribute changes to to the atext.
PadDiff.prototype._createDeletionChangeset = function (cs, startAText, apool) {
  const lines = Changeset.splitTextLines(startAText.text);
  const alines = Changeset.splitAttributionLines(startAText.attribs, startAText.text);

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

  const aLinesGet = (idx) => {
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
  let curLineNextOp = Changeset.newOp('+');

  const unpacked = Changeset.unpack(cs);
  const csIter = Changeset.opIterator(unpacked.ops);
  const builder = Changeset.builder(unpacked.newLen);

  const consumeAttribRuns = (numChars, func /* (len, attribs, endsLine)*/) => {
    if ((!curLineOpIter) || (curLineOpIterLine !== curLine)) {
      // create curLineOpIter and advance it to curChar
      curLineOpIter = Changeset.opIterator(aLinesGet(curLine));
      curLineOpIterLine = curLine;
      let indexIntoLine = 0;
      while (curLineOpIter.hasNext()) {
        curLineNextOp = curLineOpIter.next();
        if (indexIntoLine + curLineNextOp.chars >= curChar) {
          curLineNextOp.chars -= (curChar - indexIntoLine);
          break;
        }
        indexIntoLine += curLineNextOp.chars;
      }
    }

    while (numChars > 0) {
      if ((!curLineNextOp.chars) && (!curLineOpIter.hasNext())) {
        curLine++;
        curChar = 0;
        curLineOpIterLine = curLine;
        curLineNextOp.chars = 0;
        curLineOpIter = Changeset.opIterator(aLinesGet(curLine));
      }

      if (!curLineNextOp.chars) {
        curLineNextOp = curLineOpIter.hasNext() ? curLineOpIter.next() : Changeset.newOp();
      }

      const charsToUse = Math.min(numChars, curLineNextOp.chars);

      func(charsToUse, curLineNextOp.attribs,
          charsToUse === curLineNextOp.chars && curLineNextOp.lines > 0);
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
    const assem = Changeset.stringAssembler();
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

  const attribKeys = [];
  const attribValues = [];

  // iterate over all operators of this changeset
  while (csIter.hasNext()) {
    const csOp = csIter.next();

    if (csOp.opcode === '=') {
      const textBank = nextText(csOp.chars);

      // decide if this equal operator is an attribution change or not.
      // We can see this by checkinf if attribs is set.
      // If the text this operator applies to is only a star,
      // than this is a false positive and should be ignored
      if (csOp.attribs && textBank !== '*') {
        const deletedAttrib = apool.putAttrib(['removed', true]);
        let authorAttrib = apool.putAttrib(['author', '']);

        attribKeys.length = 0;
        attribValues.length = 0;
        Changeset.eachAttribNumber(csOp.attribs, (n) => {
          attribKeys.push(apool.getAttribKey(n));
          attribValues.push(apool.getAttribValue(n));

          if (apool.getAttribKey(n) === 'author') {
            authorAttrib = n;
          }
        });

        const undoBackToAttribs = cachedStrFunc((attribs) => {
          const backAttribs = [];
          for (let i = 0; i < attribKeys.length; i++) {
            const appliedKey = attribKeys[i];
            const appliedValue = attribValues[i];
            const oldValue = Changeset.attribsAttributeValue(attribs, appliedKey, apool);

            if (appliedValue !== oldValue) {
              backAttribs.push([appliedKey, oldValue]);
            }
          }

          return Changeset.makeAttribsString('=', backAttribs, apool);
        });

        const oldAttribsAddition =
            `*${Changeset.numToString(deletedAttrib)}*${Changeset.numToString(authorAttrib)}`;

        let textLeftToProcess = textBank;

        while (textLeftToProcess.length > 0) {
          // process till the next line break or process only one line break
          let lengthToProcess = textLeftToProcess.indexOf('\n');
          let lineBreak = false;
          switch (lengthToProcess) {
            case -1:
              lengthToProcess = textLeftToProcess.length;
              break;
            case 0:
              lineBreak = true;
              lengthToProcess = 1;
              break;
          }

          // get the text we want to procceed in this step
          const processText = textLeftToProcess.substr(0, lengthToProcess);

          textLeftToProcess = textLeftToProcess.substr(lengthToProcess);

          if (lineBreak) {
            builder.keep(1, 1); // just skip linebreaks, don't do a insert + keep for a linebreak

            // consume the attributes of this linebreak
            consumeAttribRuns(1, () => {});
          } else {
            // add the old text via an insert, but add a deletion attribute +
            // the author attribute of the author who deleted it
            let textBankIndex = 0;
            consumeAttribRuns(lengthToProcess, (len, attribs, endsLine) => {
              // get the old attributes back
              const oldAttribs = (undoBackToAttribs(attribs) || '') + oldAttribsAddition;

              builder.insert(processText.substr(textBankIndex, len), oldAttribs);
              textBankIndex += len;
            });

            builder.keep(lengthToProcess, 0);
          }
        }
      } else {
        skip(csOp.chars, csOp.lines);
        builder.keep(csOp.chars, csOp.lines);
      }
    } else if (csOp.opcode === '+') {
      builder.keep(csOp.chars, csOp.lines);
    } else if (csOp.opcode === '-') {
      const textBank = nextText(csOp.chars);
      let textBankIndex = 0;

      consumeAttribRuns(csOp.chars, (len, attribs, endsLine) => {
        builder.insert(textBank.substr(textBankIndex, len), attribs + csOp.attribs);
        textBankIndex += len;
      });
    }
  }

  return Changeset.checkRep(builder.toString());
};

// export the constructor
module.exports = PadDiff;
