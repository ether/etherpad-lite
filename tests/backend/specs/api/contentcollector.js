var Changeset = require("../../../../src/static/js/Changeset");
var contentcollector = require("../../../../src/static/js/contentcollector");
var AttributePool = require("../../../../src/static/js/AttributePool");
var cheerio = require("../../../../src/node_modules/cheerio");
var util = require('util');

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
  // console.warn("result", result);

  //  result.lineAttribs =  [ '*0*1*1*3+1|1+2', '*0*1*6|1+1', '*0*1*1*3+1|1+2', '*0*1*6+1|1+2', '', '+4' ]
  // console.warn("forcedresult", result);

  var i;
  for (i = 0; i < result.lines.length; i++) {
    console.log('Line ' + (i + 1) + ' attributes: ' + result.lineAttribs[i]);
  }

  // Get the new plain text and its attributes
  var newText = result.lines.join('\n');
  var newAttribs = result.lineAttribs.join('|1+1') + '|1+1';

