const Changeset = require("../../../../src/static/js/Changeset");
const contentcollector = require("../../../../src/static/js/contentcollector");
const AttributePool = require("../../../../src/static/js/AttributePool");
const cheerio = require("../../../../src/node_modules/cheerio");
const util = require('util');

//    html : "<html><body><ol class='list-number1' start='1'><li>a</li></ol><ol class='list-number1' start='2'><li>b</li></ol><ol class='list-number1' start='3'><li>c</li></ol><ol class='list-number1' start='4'><li>defg</li></ol></body></html>",

const tests = {
  ol: {
    description : "Tests if ols properly get line numbers when in a normal OL",
    html : "<html><body><ol><li>a</li><li>b</li><li>c</li><li>defg</li><li>whyonly3</li><li>always misses last</li>wtf</ol></body></html>",
    expectedLineAttribs : {},
    expectedText: ["*a","*b","*c", "*defg"]
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
  var recievedText = result.lines
  // expect recievedAttributes === expectedLineAttribs
  // expect recievedText === expectedText TODO

  console.warn(recievedAttributes, recievedText);

}
