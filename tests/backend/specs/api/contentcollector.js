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

var Changeset = require("../../../../src/static/js/Changeset");
var contentcollector = require("../../../../src/static/js/contentcollector");
var AttributePool = require("../../../../src/static/js/AttributePool");
var cheerio = require("../../../../src/node_modules/cheerio");
var util = require('util');

// await db.init(); // might not be needed
// let pad = await padManager.getPad("test"); // might not be needed
var html = "<html><body><ol class='list-number1' start='1'><li>a</li></ol><ol class='list-number1' start='2'><li>b</li></ol><ol class='list-number1' start='3'><li>c</li></ol><ol class='list-number1' start='4'><li>defg</li></ol></body></html>";
var $ = cheerio.load(html);
var doc = $('html')[0];

// Convert a dom tree into a list of lines and attribute liens
// using the content collector object
var apool = new AttributePool();
var cc = contentcollector.makeContentCollector(true, null, apool);

  try {
    // we use a try here because if the HTML is bad it will blow up
    cc.collectContent(doc);
  } catch(e) {
    // don't process the HTML because it was bad
    throw e;
  }

  var result = cc.finish();
  console.warn("result", result);

  //  result.lineAttribs =  [ '*0*1*1*3+1|1+2', '*0*1*6|1+1', '*0*1*1*3+1|1+2', '*0*1*6+1|1+2', '', '+4' ]
  // console.warn("forcedresult", result);
  var i;
  for (i = 0; i < result.lines.length; i++) {
    console.warn('Line ' + (i + 1) + ' attributes: ' + result.lineAttribs[i]);
  }
  // Get the new plain text and its attributes
  var newText = result.lines.join('\n');
  var newAttribs = result.lineAttribs.join('|1+1') + '|1+1';

  function eachAttribRun(attribs, func /*(startInNewText, endInNewText, attribs)*/ ) {
    var attribsIter = Changeset.opIterator(attribs);
    var textIndex = 0;
    var newTextStart = 0;
    var newTextEnd = newText.length;
    while (attribsIter.hasNext()) {
      var op = attribsIter.next();
      var nextIndex = textIndex + op.chars;
      if (!(nextIndex <= newTextStart || textIndex >= newTextEnd)) {
        func(Math.max(newTextStart, textIndex), Math.min(newTextEnd, nextIndex), op.attribs);
      }
      textIndex = nextIndex;
    }
  }

  // create a new changeset with a helper builder object
  var builder = Changeset.builder(1);

  // assemble each line into the builder
  eachAttribRun(newAttribs, function(start, end, attribs) {
    builder.insert(newText.substring(start, end), attribs);
  });

  // the changeset is ready!
  var theChangeset = builder.toString();

