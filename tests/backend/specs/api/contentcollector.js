const Changeset = require("../../../../src/static/js/Changeset");
const contentcollector = require("../../../../src/static/js/contentcollector");
const AttributePool = require("../../../../src/static/js/AttributePool");
const cheerio = require("../../../../src/node_modules/cheerio");
const util = require('util');

//    html : "<html><body><ol class='list-number1' start='1'><li>a</li></ol><ol class='list-number1' start='2'><li>b</li></ol><ol class='list-number1' start='3'><li>c</li></ol><ol class='list-number1' start='4'><li>defg</li></ol></body></html>",
// Test.html requires trailing <p></p>, I'm not sure why.
const tests = {
/*
  ul: {
    description : "Tests if uls properly get attributes",
    html : "<html><body><ul><li>a</li><li>b</li></ul><p></p></body></html>",
    expectedLineAttribs : [ '*0*1*2+1+1', '*0*1*2+1+1' ],
    expectedText: ["*a","*b"]
  },
*/
  ol: {
    description : "Tests if ols properly get line numbers when in a normal OL",
    html : "<html><body><ol><li>a</li><li>b</li><li>c</li><p></p></body></html>",
    expectedLineAttribs : ['derp'],
    expectedText: ["*a","*b","*c"]
  }
}

// For each test..
for (var test in tests){
  var $ = cheerio.load(tests[test].html);  // Load HTML into Cheerio
  var doc = $('html')[0]; // Creates a dom-like representation of HTML
  // Create an empty attribute pool
  var apool = new AttributePool();
  // Convert a dom tree into a list of lines and attribute liens
  // using the content collector object
  var cc = contentcollector.makeContentCollector(true, null, apool);
  cc.collectContent(doc);

  var result = cc.finish();
  var recievedAttributes = result.lineAttribs;
  var expectedAttributes = tests[test].expectedLineAttribs;
  var recievedText = new Array(result.lines)
  var expectedText = tests[test].expectedText;

  // Check recieved text matches the expected text
  if(arraysEqual(recievedText[0], expectedText)){
    console.log("PASS: Recieved Text matched Expected Text");
  }else{
    console.error("FAIL: Recieved Text did not match Expected Text", recievedText[0], tests[test].expectedText)
  }

  // Check recieved attributes matches the expected attributes
  if(arraysEqual(recievedAttributes, expectedAttributes)){
    console.log("PASS: Recieved Attributes matched Expected Attributes");
  }else{
    console.error("FAIL: Recieved Text did not match Expected Attributes", recievedAttributes, expectedAttributes)
  }

  // console.warn(recievedAttributes, recievedText);

}




function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
