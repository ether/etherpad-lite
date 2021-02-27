'use strict';

const Changeset = require('./Changeset');
const ChangesetUtils = require('./ChangesetUtils');
const _ = require('./underscore');

const lineMarkerAttribute = 'lmkr';

// Some of these attributes are kept for compatibility purposes.
// Not sure if we need all of them
const DEFAULT_LINE_ATTRIBUTES = ['author', 'lmkr', 'insertorder', 'start'];

// If one of these attributes are set to the first character of a
// line it is considered as a line attribute marker i.e. attributes
// set on this marker are applied to the whole line.
// The list attribute is only maintained for compatibility reasons
const lineAttributes = [lineMarkerAttribute, 'list'];

/*
  The Attribute manager builds changesets based on a document
  representation for setting and removing range or line-based attributes.

  @param rep the document representation to be used
  @param applyChangesetCallback this callback will be called
    once a changeset has been built.


  A document representation contains
  - an array `alines` containing 1 attributes string for each line
  - an Attribute pool `apool`
  - a SkipList `lines` containing the text lines of the document.
*/

const AttributeManager = function (rep, applyChangesetCallback) {
  this.rep = rep;
  this.applyChangesetCallback = applyChangesetCallback;
  this.author = '';

  // If the first char in a line has one of the following attributes
  // it will be considered as a line marker
};

AttributeManager.DEFAULT_LINE_ATTRIBUTES = DEFAULT_LINE_ATTRIBUTES;
AttributeManager.lineAttributes = lineAttributes;

AttributeManager.prototype = _(AttributeManager.prototype).extend({

  applyChangeset(changeset) {
    if (!this.applyChangesetCallback) return changeset;

    const cs = changeset.toString();
    if (!Changeset.isIdentity(cs)) {
      this.applyChangesetCallback(cs);
    }

    return changeset;
  },

  /*
    Sets attributes on a range
    @param start [row, col] tuple pointing to the start of the range
    @param end [row, col] tuple pointing to the end of the range
    @param attribs: an array of attributes
  */
  setAttributesOnRange(start, end, attribs) {
    // instead of applying the attributes to the whole range at once, we need to apply them
    // line by line, to be able to disregard the "*" used as line marker. For more details,
    // see https://github.com/ether/etherpad-lite/issues/2772
    let allChangesets;
    for (let row = start[0]; row <= end[0]; row++) {
      const rowRange = this._findRowRange(row, start, end);
      const startCol = rowRange[0];
      const endCol = rowRange[1];

      const rowChangeset = this._setAttributesOnRangeByLine(row, startCol, endCol, attribs);

      // compose changesets of all rows into a single changeset
      // as the range might not be continuous
      // due to the presence of line markers on the rows
      if (allChangesets) {
        allChangesets = Changeset.compose(
            allChangesets.toString(), rowChangeset.toString(), this.rep.apool);
      } else {
        allChangesets = rowChangeset;
      }
    }

    return this.applyChangeset(allChangesets);
  },

  _findRowRange(row, start, end) {
    let startCol, endCol;

    const startLineOffset = this.rep.lines.offsetOfIndex(row);
    const endLineOffset = this.rep.lines.offsetOfIndex(row + 1);
    const lineLength = endLineOffset - startLineOffset;

    // find column where range on this row starts
    if (row === start[0]) { // are we on the first row of range?
      startCol = start[1];
    } else {
      startCol = this.lineHasMarker(row) ? 1 : 0; // remove "*" used as line marker
    }

    // find column where range on this row ends
    if (row === end[0]) { // are we on the last row of range?
      endCol = end[1]; // if so, get the end of range, not end of row
    } else {
      endCol = lineLength - 1; // remove "\n"
    }

    return [startCol, endCol];
  },

  /*
    Sets attributes on a range, by line
    @param row the row where range is
    @param startCol column where range starts
    @param endCol column where range ends
    @param attribs: an array of attributes
  */
  _setAttributesOnRangeByLine(row, startCol, endCol, attribs) {
    const builder = Changeset.builder(this.rep.lines.totalWidth());
    ChangesetUtils.buildKeepToStartOfRange(this.rep, builder, [row, startCol]);
    ChangesetUtils.buildKeepRange(
        this.rep, builder, [row, startCol], [row, endCol], attribs, this.rep.apool);
    return builder;
  },

  /*
    Returns if the line already has a line marker
    @param lineNum: the number of the line
  */
  lineHasMarker(lineNum) {
    return lineAttributes.find(
        (attribute) => this.getAttributeOnLine(lineNum, attribute) !== '') !== undefined;
  },

  /*
    Gets a specified attribute on a line
    @param lineNum: the number of the line to set the attribute for
    @param attributeKey: the name of the attribute to get, e.g. list
  */
  getAttributeOnLine(lineNum, attributeName) {
    // get  `attributeName` attribute of first char of line
    const aline = this.rep.alines[lineNum];
    if (aline) {
      const opIter = Changeset.opIterator(aline);
      if (opIter.hasNext()) {
        return Changeset.opAttributeValue(opIter.next(), attributeName, this.rep.apool) || '';
      }
    }
    return '';
  },

  /*
    Gets all attributes on a line
    @param lineNum: the number of the line to get the attribute for
  */
  getAttributesOnLine(lineNum) {
    // get attributes of first char of line
    const aline = this.rep.alines[lineNum];
    const attributes = [];
    if (aline) {
      const opIter = Changeset.opIterator(aline);
      let op;
      if (opIter.hasNext()) {
        op = opIter.next();
        if (!op.attribs) return [];

        Changeset.eachAttribNumber(op.attribs, (n) => {
          attributes.push([this.rep.apool.getAttribKey(n), this.rep.apool.getAttribValue(n)]);
        });
        return attributes;
      }
    }
    return [];
  },

  /*
    Gets a given attribute on a selection
    @param attributeName
    @param prevChar
    returns true or false if an attribute is visible in range
  */
  getAttributeOnSelection(attributeName, prevChar) {
    const rep = this.rep;
    if (!(rep.selStart && rep.selEnd)) return;
    // If we're looking for the caret attribute not the selection
    // has the user already got a selection or is this purely a caret location?
    const isNotSelection = (rep.selStart[0] === rep.selEnd[0] && rep.selEnd[1] === rep.selStart[1]);
    if (isNotSelection) {
      if (prevChar) {
        // If it's not the start of the line
        if (rep.selStart[1] !== 0) {
          rep.selStart[1]--;
        }
      }
    }

    const withIt = Changeset.makeAttribsString('+', [
      [attributeName, 'true'],
    ], rep.apool);
    const withItRegex = new RegExp(`${withIt.replace(/\*/g, '\\*')}(\\*|$)`);
    const hasIt = (attribs) => withItRegex.test(attribs);

    const rangeHasAttrib = (selStart, selEnd) => {
      // if range is collapsed -> no attribs in range
      if (selStart[1] === selEnd[1] && selStart[0] === selEnd[0]) return false;

      if (selStart[0] !== selEnd[0]) { // -> More than one line selected
        // from selStart to the end of the first line
        let hasAttrib = rangeHasAttrib(
            selStart, [selStart[0], rep.lines.atIndex(selStart[0]).text.length]);

        // for all lines in between
        for (let n = selStart[0] + 1; n < selEnd[0]; n++) {
          hasAttrib = hasAttrib && rangeHasAttrib([n, 0], [n, rep.lines.atIndex(n).text.length]);
        }

        // for the last, potentially partial, line
        hasAttrib = hasAttrib && rangeHasAttrib([selEnd[0], 0], [selEnd[0], selEnd[1]]);

        return hasAttrib;
      }

      // Logic tells us we now have a range on a single line

      const lineNum = selStart[0];
      const start = selStart[1];
      const end = selEnd[1];
      let hasAttrib = true;

      // Iterate over attribs on this line

      const opIter = Changeset.opIterator(rep.alines[lineNum]);
      let indexIntoLine = 0;

      while (opIter.hasNext()) {
        const op = opIter.next();
        const opStartInLine = indexIntoLine;
        const opEndInLine = opStartInLine + op.chars;
        if (!hasIt(op.attribs)) {
          // does op overlap selection?
          if (!(opEndInLine <= start || opStartInLine >= end)) {
            // since it's overlapping but hasn't got the attrib -> range hasn't got it
            hasAttrib = false;
            break;
          }
        }
        indexIntoLine = opEndInLine;
      }

      return hasAttrib;
    };
    return rangeHasAttrib(rep.selStart, rep.selEnd);
  },

  /*
    Gets all attributes at a position containing line number and column
    @param lineNumber starting with zero
    @param column starting with zero
    returns a list of attributes in the format
    [ ["key","value"], ["key","value"], ...  ]
  */
  getAttributesOnPosition(lineNumber, column) {
    // get all attributes of the line
    const aline = this.rep.alines[lineNumber];

    if (!aline) {
      return [];
    }
    // iterate through all operations of a line
    const opIter = Changeset.opIterator(aline);

    // we need to sum up how much characters each operations take until the wanted position
    let currentPointer = 0;
    const attributes = [];
    let currentOperation;

    while (opIter.hasNext()) {
      currentOperation = opIter.next();
      currentPointer += currentOperation.chars;

      if (currentPointer > column) {
        // we got the operation of the wanted position, now collect all its attributes
        Changeset.eachAttribNumber(currentOperation.attribs, (n) => {
          attributes.push([
            this.rep.apool.getAttribKey(n),
            this.rep.apool.getAttribValue(n),
          ]);
        });

        // skip the loop
        return attributes;
      }
    }
    return attributes;
  },

  /*
    Gets all attributes at caret position
    if the user selected a range, the start of the selection is taken
    returns a list of attributes in the format
    [ ["key","value"], ["key","value"], ...  ]
  */
  getAttributesOnCaret() {
    return this.getAttributesOnPosition(this.rep.selStart[0], this.rep.selStart[1]);
  },

  /*
    Sets a specified attribute on a line
    @param lineNum: the number of the line to set the attribute for
    @param attributeKey: the name of the attribute to set, e.g. list
    @param attributeValue: an optional parameter to pass to the attribute (e.g. indention level)

  */
  setAttributeOnLine(lineNum, attributeName, attributeValue) {
    let loc = [0, 0];
    const builder = Changeset.builder(this.rep.lines.totalWidth());
    const hasMarker = this.lineHasMarker(lineNum);

    ChangesetUtils.buildKeepRange(this.rep, builder, loc, (loc = [lineNum, 0]));

    if (hasMarker) {
      ChangesetUtils.buildKeepRange(this.rep, builder, loc, (loc = [lineNum, 1]), [
        [attributeName, attributeValue],
      ], this.rep.apool);
    } else {
      // add a line marker
      builder.insert('*', [
        ['author', this.author],
        ['insertorder', 'first'],
        [lineMarkerAttribute, '1'],
        [attributeName, attributeValue],
      ], this.rep.apool);
    }

    return this.applyChangeset(builder);
  },

  /**
   * Removes a specified attribute on a line
   *  @param lineNum the number of the affected line
   *  @param attributeName the name of the attribute to remove, e.g. list
   *  @param attributeValue if given only attributes with equal value will be removed
   */
  removeAttributeOnLine(lineNum, attributeName, attributeValue) {
    const builder = Changeset.builder(this.rep.lines.totalWidth());
    const hasMarker = this.lineHasMarker(lineNum);
    let found = false;

    const attribs = this.getAttributesOnLine(lineNum).map((attrib) => {
      if (attrib[0] === attributeName && (!attributeValue || attrib[0] === attributeValue)) {
        found = true;
        return [attrib[0], ''];
      } else if (attrib[0] === 'author') {
        // update last author to make changes to line attributes on this line
        return [attrib[0], this.author];
      }
      return attrib;
    });

    if (!found) {
      return;
    }

    ChangesetUtils.buildKeepToStartOfRange(this.rep, builder, [lineNum, 0]);

    const countAttribsWithMarker = _.chain(attribs).filter((a) => !!a[1])
        .map((a) => a[0]).difference(DEFAULT_LINE_ATTRIBUTES).size().value();

    // if we have marker and any of attributes don't need to have marker. we need delete it
    if (hasMarker && !countAttribsWithMarker) {
      ChangesetUtils.buildRemoveRange(this.rep, builder, [lineNum, 0], [lineNum, 1]);
    } else {
      ChangesetUtils.buildKeepRange(
          this.rep, builder, [lineNum, 0], [lineNum, 1], attribs, this.rep.apool);
    }

    return this.applyChangeset(builder);
  },

  /*
     Toggles a line attribute for the specified line number
     If a line attribute with the specified name exists with any value it will be removed
     Otherwise it will be set to the given value
     @param lineNum: the number of the line to toggle the attribute for
     @param attributeKey: the name of the attribute to toggle, e.g. list
     @param attributeValue: the value to pass to the attribute (e.g. indention level)
  */
  toggleAttributeOnLine(lineNum, attributeName, attributeValue) {
    return this.getAttributeOnLine(lineNum, attributeName)
      ? this.removeAttributeOnLine(lineNum, attributeName)
      : this.setAttributeOnLine(lineNum, attributeName, attributeValue);
  },

  hasAttributeOnSelectionOrCaretPosition(attributeName) {
    const hasSelection = (
      (this.rep.selStart[0] !== this.rep.selEnd[0]) || (this.rep.selEnd[1] !== this.rep.selStart[1])
    );
    let hasAttrib;
    if (hasSelection) {
      hasAttrib = this.getAttributeOnSelection(attributeName);
    } else {
      const attributesOnCaretPosition = this.getAttributesOnCaret();
      const allAttribs = [].concat(...attributesOnCaretPosition); // flatten
      hasAttrib = allAttribs.includes(attributeName);
    }
    return hasAttrib;
  },
});

module.exports = AttributeManager;
