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

var jsdom = require('jsdom-nocontextifiy').jsdom;
var log4js = require('log4js');


var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var contentcollector = require("ep_etherpad-lite/static/js/contentcollector");

function setPadHTML(pad, html, callback)
{
  var apiLogger = log4js.getLogger("ImportHtml");

  // Clean the pad. This makes the rest of the code easier
  // by several orders of magnitude.
  pad.setText("");
  var padText = pad.text();

  // Parse the incoming HTML with jsdom
  try{
    var doc = jsdom(html.replace(/>\n+</g, '><'));
  }catch(e){
    apiLogger.warn("Error importing, possibly caused by malformed HTML");
    var doc = jsdom("<html><body><div>Error during import, possibly malformed HTML</div></body></html>");
  }

  apiLogger.debug('html:');
  apiLogger.debug(html);

  // Convert a dom tree into a list of lines and attribute liens
  // using the content collector object
  var cc = contentcollector.makeContentCollector(true, null, pad.pool);
  cc.collectContent(doc.childNodes[0]);
  var result = cc.finish();
  apiLogger.debug('Lines:');
  var i;
  for (i = 0; i < result.lines.length; i += 1)
  {
    apiLogger.debug('Line ' + (i + 1) + ' text: ' + result.lines[i]);
    apiLogger.debug('Line ' + (i + 1) + ' attributes: ' + result.lineAttribs[i]);
  }

  // Get the new plain text and its attributes
  var newText = result.lines.join('\n');
  apiLogger.debug('newText:');
  apiLogger.debug(newText);
  var newAttribs = result.lineAttribs.join('|1+1') + '|1+1';

  function eachAttribRun(attribs, func /*(startInNewText, endInNewText, attribs)*/ )
  {
    var attribsIter = Changeset.opIterator(attribs);
    var textIndex = 0;
    var newTextStart = 0;
    var newTextEnd = newText.length;
    while (attribsIter.hasNext())
    {
      var op = attribsIter.next();
      var nextIndex = textIndex + op.chars;
      if (!(nextIndex <= newTextStart || textIndex >= newTextEnd))
      {
        func(Math.max(newTextStart, textIndex), Math.min(newTextEnd, nextIndex), op.attribs);
      }
      textIndex = nextIndex;
    }
  }

  // create a new changeset with a helper builder object
  var builder = Changeset.builder(1);

  // assemble each line into the builder
  eachAttribRun(newAttribs, function(start, end, attribs)
  {
    builder.insert(newText.substring(start, end), attribs);
  });

  // the changeset is ready!
  var theChangeset = builder.toString();
  apiLogger.debug('The changeset: ' + theChangeset);
  pad.appendRevision(theChangeset);
}

exports.setPadHTML = setPadHTML;
