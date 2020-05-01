const Changeset        = require("./src/static/js/Changeset");
const contentcollector = require("./src/static/js/contentcollector");
const AttributePool    = require("./src/static/js/AttributePool");
const cheerio          = require("./src/node_modules/cheerio");
const util             = require('util');

const tests = {

  complexNest:{
    description: "Complex list of different types",
    html: '<!doctype html><html><body><ul class="bullet"><li>one</li><li>two</li><li>0</li><li>1</li><li>2<ul class="bullet"><li>3</li><li>4</li></ul></li></ul><ol class="number"><li>item<ol class="number"><li>item1</li><li>item2</li></ol></li></ol></body></html>',
    expectedLineAttribs : [
      '*0*1*2+1+3',
      '*0*1*2+1+3',
      '*0*1*2+1+1',
      '*0*1*2+1+1',
      '*0*1*2+1+1',
      '*0*3*2+1+1',
      '*0*3*2+1+1',
      '*0*4*2*5+1+4',
      '',
      ''
    ],
    expectedText: [
      '*one',   '*two',
      '*0',     '*1',
      '*2',     '*3',
      '*4',     '*item',
      '*item1', '*item2'
    ]
  }
}

// For each test..
for (let test in tests){
  let testObj = tests[test];

//  describe(test, function() {
//    it(testObj.description, function(done) {
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
        // console.log("PASS: Recieved Text did match Expected Text\nRecieved:", recievedText[0], "\nExpected:", testObj.expectedText)
      }else{
        // console.error("FAIL: Recieved Text did not match Expected Text\nRecieved:", recievedText[0], "\nExpected:", testObj.expectedText)
        // throw new Error();
      }

      // Check recieved attributes matches the expected attributes
      if(arraysEqual(recievedAttributes, expectedAttributes)){
        //console.log("PASS: Recieved Attributes matched Expected Attributes");
        done();
      }else{
        //console.error("FAIL", test, testObj.description);
        //console.error("FAIL: Recieved Attributes did not match Expected Attributes\nRecieved: ", recievedAttributes, "\nExpected: ", expectedAttributes)
        // console.error("FAILING HTML", testObj.html);
        //throw new Error();
      }
//    });

//  });

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
