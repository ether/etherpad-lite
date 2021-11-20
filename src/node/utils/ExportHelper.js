'use strict';
/**
 * Helpers for export requests
 */

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
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

exports.getPadPlainText = (pad, revNum) => {
  const _analyzeLine = exports._analyzeLine;
  const atext = ((revNum !== undefined) ? pad.getInternalRevisionAText(revNum) : pad.atext);
  const textLines = atext.text.slice(0, -1).split('\n');
  const attribLines = Changeset.splitAttributionLines(atext.attribs, atext.text);
  const apool = pad.pool;

  const pieces = [];
  for (let i = 0; i < textLines.length; i++) {
    const line = _analyzeLine(textLines[i], attribLines[i], apool);
    if (line.listLevel) {
      const numSpaces = line.listLevel * 2 - 1;
      const bullet = '*';
      pieces.push(new Array(numSpaces + 1).join(' '), bullet, ' ', line.text, '\n');
    } else {
      pieces.push(line.text, '\n');
    }
  }

  return pieces.join('');
};


exports._analyzeLine = (text, aline, apool) => {
  const line = {};

  // identify list
  let lineMarker = 0;
  line.listLevel = 0;
  if (aline) {
    const opIter = Changeset.opIterator(aline);
    if (opIter.hasNext()) {
      const op = opIter.next();
      let listType = Changeset.opAttributeValue(op, 'list', apool);
      if (listType) {
        lineMarker = 1;
        listType = /([a-z]+)([0-9]+)/.exec(listType);
        if (listType) {
          line.listTypeName = listType[1];
          line.listLevel = Number(listType[2]);
        }
      }
      const start = Changeset.opAttributeValue(op, 'start', apool);
      if (start) {
        line.start = start;
      }
    }
  }
  if (lineMarker) {
    line.text = text.substring(1);
    line.aline = Changeset.subattribution(aline, 1);
  } else {
    line.text = text;
    line.aline = aline;
  }
  return line;
};


exports._encodeWhitespace =
  (s) => s.replace(/[^\x21-\x7E\s\t\n\r]/gu, (c) => `&#${c.codePointAt(0)};`);
