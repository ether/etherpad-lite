'use strict';
/**
 * TXT export
 */

/*
 * 2013 John McLear
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

const Changeset = require('../../static/js/Changeset');
const attributes = require('../../static/js/attributes');
const padManager = require('../db/PadManager');
const _analyzeLine = require('./ExportHelper')._analyzeLine;

// This is slightly different than the HTML method as it passes the output to getTXTFromAText
const getPadTXT = async (pad, revNum) => {
  let atext = pad.atext;

  if (revNum !== undefined) {
    // fetch revision atext
    atext = await pad.getInternalRevisionAText(revNum);
  }

  // convert atext to html
  return getTXTFromAtext(pad, atext);
};

// This is different than the functionality provided in ExportHtml as it provides formatting
// functionality that is designed specifically for TXT exports
const getTXTFromAtext = (pad, atext, authorColors) => {
  const apool = pad.apool();
  const textLines = atext.text.slice(0, -1).split('\n');
  const attribLines = Changeset.splitAttributionLines(atext.attribs, atext.text);

  const props = ['heading1', 'heading2', 'bold', 'italic', 'underline', 'strikethrough'];
  const anumMap = {};
  const css = '';

  props.forEach((propName, i) => {
    const propTrueNum = apool.putAttrib([propName, true], true);
    if (propTrueNum >= 0) {
      anumMap[propTrueNum] = i;
    }
  });

  const getLineTXT = (text, attribs) => {
    const propVals = [false, false, false];
    const ENTER = 1;
    const STAY = 2;
    const LEAVE = 0;

    // Use order of tags (b/i/u) as order of nesting, for simplicity
    // and decent nesting.  For example,
    // <b>Just bold<b> <b><i>Bold and italics</i></b> <i>Just italics</i>
    // becomes
    // <b>Just bold <i>Bold and italics</i></b> <i>Just italics</i>
    const taker = Changeset.stringIterator(text);
    let assem = '';

    let idx = 0;

    const processNextChars = (numChars) => {
      if (numChars <= 0) {
        return;
      }

      const ops = Changeset.deserializeOps(Changeset.subattribution(attribs, idx, idx + numChars));
      idx += numChars;

      for (const o of ops) {
        let propChanged = false;

        for (const a of attributes.decodeAttribString(o.attribs)) {
          if (a in anumMap) {
            const i = anumMap[a]; // i = 0 => bold, etc.

            if (!propVals[i]) {
              propVals[i] = ENTER;
              propChanged = true;
            } else {
              propVals[i] = STAY;
            }
          }
        }

        for (let i = 0; i < propVals.length; i++) {
          if (propVals[i] === true) {
            propVals[i] = LEAVE;
            propChanged = true;
          } else if (propVals[i] === STAY) {
            // set it back
            propVals[i] = true;
          }
        }

        // now each member of propVal is in {false,LEAVE,ENTER,true}
        // according to what happens at start of span
        if (propChanged) {
          // leaving bold (e.g.) also leaves italics, etc.
          let left = false;

          for (let i = 0; i < propVals.length; i++) {
            const v = propVals[i];

            if (!left) {
              if (v === LEAVE) {
                left = true;
              }
            } else if (v === true) {
              // tag will be closed and re-opened
              propVals[i] = STAY;
            }
          }

          const tags2close = [];

          for (let i = propVals.length - 1; i >= 0; i--) {
            if (propVals[i] === LEAVE) {
              // emitCloseTag(i);
              tags2close.push(i);
              propVals[i] = false;
            } else if (propVals[i] === STAY) {
              // emitCloseTag(i);
              tags2close.push(i);
            }
          }

          for (let i = 0; i < propVals.length; i++) {
            if (propVals[i] === ENTER || propVals[i] === STAY) {
              propVals[i] = true;
            }
          }
          // propVals is now all {true,false} again
        } // end if (propChanged)

        let chars = o.chars;
        if (o.lines) {
          // exclude newline at end of line, if present
          chars--;
        }

        const s = taker.take(chars);

        // removes the characters with the code 12. Don't know where they come
        // from but they break the abiword parser and are completly useless
        // s = s.replace(String.fromCharCode(12), "");

        // remove * from s, it's just not needed on a blank line..  This stops
        // plugins from being able to display * at the beginning of a line
        // s = s.replace("*", ""); // Then remove it

        assem += s;
      } // end iteration over spans in line

      const tags2close = [];
      for (let i = propVals.length - 1; i >= 0; i--) {
        if (propVals[i]) {
          tags2close.push(i);
          propVals[i] = false;
        }
      }
    };
    // end processNextChars

    processNextChars(text.length - idx);
    return assem;
  };
  // end getLineHTML

  const pieces = [css];

  // Need to deal with constraints imposed on HTML lists; can
  // only gain one level of nesting at once, can't change type
  // mid-list, etc.
  // People might use weird indenting, e.g. skip a level,
  // so we want to do something reasonable there.  We also
  // want to deal gracefully with blank lines.
  // => keeps track of the parents level of indentation

  const listNumbers = {};
  let prevListLevel;

  for (let i = 0; i < textLines.length; i++) {
    const line = _analyzeLine(textLines[i], attribLines[i], apool);
    let lineContent = getLineTXT(line.text, line.aline);

    if (line.listTypeName === 'bullet') {
      lineContent = `* ${lineContent}`; // add a bullet
    }

    if (line.listTypeName !== 'number') {
      // We're no longer in an OL so we can reset counting
      for (const key of Object.keys(listNumbers)) {
        delete listNumbers[key];
      }
    }

    if (line.listLevel > 0) {
      for (let j = line.listLevel - 1; j >= 0; j--) {
        pieces.push('\t'); // tab indent list numbers..
        if (!listNumbers[line.listLevel]) {
          listNumbers[line.listLevel] = 0;
        }
      }

      if (line.listTypeName === 'number') {
        /*
        * listLevel == amount of indentation
        * listNumber(s) == item number
        *
        * Example:
        * 1. foo
        *  1.1 bah
        * 2. latte
        *  2.1 latte
        *
        * To handle going back to 2.1 when prevListLevel is lower number
        * than current line.listLevel then reset the object value
        */
        if (line.listLevel < prevListLevel) {
          delete listNumbers[prevListLevel];
        }

        listNumbers[line.listLevel]++;
        if (line.listLevel > 1) {
          let x = 1;
          while (x <= line.listLevel - 1) {
            // if it's undefined to avoid undefined.undefined.1 for 0.0.1
            if (!listNumbers[x]) listNumbers[x] = 0;
            pieces.push(`${listNumbers[x]}.`);
            x++;
          }
        }
        pieces.push(`${listNumbers[line.listLevel]}. `);
        prevListLevel = line.listLevel;
      }

      pieces.push(lineContent, '\n');
    } else {
      pieces.push(lineContent, '\n');
    }
  }

  return pieces.join('');
};

exports.getTXTFromAtext = getTXTFromAtext;

exports.getPadTXTDocument = async (padId, revNum) => {
  const pad = await padManager.getPad(padId);
  return getPadTXT(pad, revNum);
};
