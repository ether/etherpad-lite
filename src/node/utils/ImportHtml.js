'use strict';
/**
 * Copyright Yaco Sistemas S.L. 2011.
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

const log4js = require('log4js');
const Changeset = require('../../static/js/Changeset');
const contentcollector = require('../../static/js/contentcollector');
const jsdom = require('jsdom');
const rehype = require('rehype');
const minifyWhitespace = require('rehype-minify-whitespace');

exports.setPadHTML = async (pad, html) => {
  const apiLogger = log4js.getLogger('ImportHtml');

  rehype()
      .use(minifyWhitespace, {newlines: false})
      .process(html, (err, output) => {
        html = String(output);
      });

  const {window: {document}} = new jsdom.JSDOM(html);

  // Appends a line break, used by Etherpad to ensure a caret is available
  // below the last line of an import
  document.body.appendChild(document.createElement('p'));

  apiLogger.debug('html:');
  apiLogger.debug(html);

  // Convert a dom tree into a list of lines and attribute liens
  // using the content collector object
  const cc = contentcollector.makeContentCollector(true, null, pad.pool);
  try {
    // we use a try here because if the HTML is bad it will blow up
    cc.collectContent(document.body);
  } catch (e) {
    apiLogger.warn('HTML was not properly formed', e);

    // don't process the HTML because it was bad
    throw e;
  }

  const result = cc.finish();

  apiLogger.debug('Lines:');

  let i;
  for (i = 0; i < result.lines.length; i++) {
    apiLogger.debug(`Line ${i + 1} text: ${result.lines[i]}`);
    apiLogger.debug(`Line ${i + 1} attributes: ${result.lineAttribs[i]}`);
  }

  // Get the new plain text and its attributes
  const newText = result.lines.join('\n');
  apiLogger.debug('newText:');
  apiLogger.debug(newText);
  const newAttribs = `${result.lineAttribs.join('|1+1')}|1+1`;

  const eachAttribRun = (attribs, func /* (startInNewText, endInNewText, attribs)*/) => {
    const attribsIter = Changeset.opIterator(attribs);
    let textIndex = 0;
    const newTextStart = 0;
    const newTextEnd = newText.length;
    while (attribsIter.hasNext()) {
      const op = attribsIter.next();
      const nextIndex = textIndex + op.chars;
      if (!(nextIndex <= newTextStart || textIndex >= newTextEnd)) {
        func(Math.max(newTextStart, textIndex), Math.min(newTextEnd, nextIndex), op.attribs);
      }
      textIndex = nextIndex;
    }
  };

  // create a new changeset with a helper builder object
  const builder = Changeset.builder(1);

  // assemble each line into the builder
  eachAttribRun(newAttribs, (start, end, attribs) => {
    builder.insert(newText.substring(start, end), attribs);
  });

  // the changeset is ready!
  const theChangeset = builder.toString();

  apiLogger.debug(`The changeset: ${theChangeset}`);
  await Promise.all([
    pad.setText('\n'),
    pad.appendRevision(theChangeset),
  ]);
};
