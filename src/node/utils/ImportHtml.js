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

const apiLogger = log4js.getLogger('ImportHtml');
const processor = rehype().use(minifyWhitespace, {newlines: false});

exports.setPadHTML = async (pad, html) => {
  html = String(await processor.process(html));
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
  } catch (err) {
    apiLogger.warn(`Error processing HTML: ${err.stack || err}`);
    throw err;
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

  // create a new changeset with a helper builder object
  const builder = Changeset.builder(1);

  // assemble each line into the builder
  const attribsIter = Changeset.opIterator(newAttribs);
  let textIndex = 0;
  const newTextStart = 0;
  const newTextEnd = newText.length;
  while (attribsIter.hasNext()) {
    const op = attribsIter.next();
    const nextIndex = textIndex + op.chars;
    if (!(nextIndex <= newTextStart || textIndex >= newTextEnd)) {
      const start = Math.max(newTextStart, textIndex);
      const end = Math.min(newTextEnd, nextIndex);
      builder.insert(newText.substring(start, end), op.attribs);
    }
    textIndex = nextIndex;
  }

  // the changeset is ready!
  const theChangeset = builder.toString();

  apiLogger.debug(`The changeset: ${theChangeset}`);
  await pad.setText('\n');
  if (!Changeset.isIdentity(theChangeset)) await pad.appendRevision(theChangeset);
};
