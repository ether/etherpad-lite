const Changeset        = require("./src/static/js/Changeset");
const contentcollector = require("./src/static/js/contentcollector");
const AttributePool    = require("./src/static/js/AttributePool");
const cheerio          = require("./src/node_modules/cheerio");
const util             = require('util');

var testToRun = process.argv[2];
console.log("testToRun", testToRun);

//    html : "<html><body><ol class='list-number1' start='1'><li>a</li></ol><ol class='list-number1' start='2'><li>b</li></ol><ol class='list-number1' start='3'><li>c</li></ol><ol class='list-number1' start='4'><li>defg</li></ol></body></html>",
// Test.html requires trailing <p></p>, I'm not sure why.
const tests = {
  ol: {
    description : "Tests if ols properly get line numbers when in a normal OL",
    html : "<html><body>a<ol><li>b<ol><li>c</li></ol></ol>notlist<p>foo</p></body></html>",
    expectedLineAttribs : [ '+1', '*0*1*2*3+1+1', '*0*4*2*5+1+1', '+7', '+3' ],
    expectedText: ["a","*b","*c", "notlist", "foo"],
    noteToSelf: "Ensure empty P does not induce line attribute marker, wont this break the editor?"
  }
}

// For each test..
 for (let test in tests){
  let testObj = tests[test];
/*  var run = true;
  if(testToRun){
    if(test !== testToRun){
      console.warn("not running");
      // not running
      run = false;
    }
  }else{
    run = true;
  }

  if(run === true){
*/

console.log(test, testObj.description, testObj.expectedText);
    var $ = cheerio.load(testObj.html);  // Load HTML into Cheerio
    var doc = $('html')[0]; // Creates a dom-like representation of HTML
    // Create an empty attribute pool
    var apool = new AttributePool();
    // Convert a dom tree into a list of lines and attribute liens
    // using the content collector object
    var cc = contentcollector.makeContentCollector(true, null, apool);
    cc.collectContent(doc);
    var result = cc.finish();
    var recievedAttributes = result.lineAttribs;
    var expectedAttributes = testObj.expectedLineAttribs;
    var recievedText = new Array(result.lines)
    var expectedText = testObj.expectedText;

    // Check recieved text matches the expected text
    if(arraysEqual(recievedText[0], expectedText)){
//      console.log("PASS: Recieved Text did match Expected Text\nRecieved:", recievedText[0], "\nExpected:", testObj.expectedText)

    }else{
      console.error("FAIL: Recieved Text did not match Expected Text\nRecieved:", recievedText[0], "\nExpected:", testObj.expectedText)
//      throw new Error();

    }

    // Check recieved attributes matches the expected attributes
    if(arraysEqual(recievedAttributes, expectedAttributes)){
//      console.log("PASS: Recieved Attributes matched Expected Attributes");
    }else{
      console.error("FAIL", test, testObj.description);
      console.error("FAIL: Recieved Attributes did not match Expected Attributes\nRecieved: ", recievedAttributes, "\nExpected: ", expectedAttributes)
      console.error("FAILING HTML", testObj.html);
//      throw new Error();
    }
    console.log("\n\n");

};




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
