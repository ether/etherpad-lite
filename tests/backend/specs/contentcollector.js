const Changeset        = require("../../../src/static/js/Changeset");
const contentcollector = require("../../../src/static/js/contentcollector");
const AttributePool    = require("../../../src/static/js/AttributePool");
const cheerio          = require("../../../src/node_modules/cheerio");
const util             = require('util');

const tests = {
  nestedLi:{
    description: "Complex nested Li",
    html: '<!doctype html><html><body><ol><li>one</li><li><ol><li>1.1</li></ol></li><li>two</li></ol></body></html>',
    expectedLineAttribs : [
      '*0*1*2*3+1+3', '*0*4*2*5+1+3', '*0*1*2*5+1+3'
    ],
    expectedText: [
      '*one', '*1.1', '*two'
    ]
  },
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
      '*0*6*2*7+1+5',
      '*0*6*2*7+1+5'
    ],
    expectedText: [
      '*one',   '*two',
      '*0',     '*1',
      '*2',     '*3',
      '*4',     '*item',
      '*item1', '*item2'
    ]
  },
  ul: {
    description : "Tests if uls properly get attributes",
    html : "<html><body><ul><li>a</li><li>b</li></ul><div>div</div><p>foo</p></body></html>",
    expectedLineAttribs : [ '*0*1*2+1+1', '*0*1*2+1+1', '+3' , '+3'],
    expectedText: ["*a","*b", "div", "foo"]
  }
  ,
  ulIndented: {
    description : "Tests if indented uls properly get attributes",
    html : "<html><body><ul><li>a</li><ul><li>b</li></ul><li>a</li></ul><p>foo</p></body></html>",
    expectedLineAttribs : [ '*0*1*2+1+1', '*0*3*2+1+1', '*0*1*2+1+1', '+3' ],
    expectedText: ["*a","*b", "*a", "foo"]
  },
  ol: {
    description : "Tests if ols properly get line numbers when in a normal OL",
    html : "<html><body><ol><li>a</li><li>b</li><li>c</li></ol><p>test</p></body></html>",
    expectedLineAttribs : ['*0*1*2*3+1+1', '*0*1*2*3+1+1', '*0*1*2*3+1+1', '+4'],
    expectedText: ["*a","*b","*c", "test"],
    noteToSelf: "Ensure empty P does not induce line attribute marker, wont this break the editor?"
  }
  ,
  lineDoBreakInOl:{
    description : "A single completely empty line break within an ol should reset count if OL is closed off..",
    html : "<html><body><ol><li>should be 1</li></ol><p>hello</p><ol><li>should be 1</li><li>should be 2</li></ol><p></p></body></html>",
    expectedLineAttribs : [ '*0*1*2*3+1+b', '+5', '*0*1*2*4+1+b', '*0*1*2*4+1+b', '' ],
    expectedText: ["*should be 1","hello", "*should be 1","*should be 2", ""],
    noteToSelf: "Shouldn't include attribute marker in the <p> line"
  },
  bulletListInOL:{
    description : "A bullet within an OL should not change numbering..",
    html : "<html><body><ol><li>should be 1</li><ul><li>should be a bullet</li></ul><li>should be 2</li></ol><p></p></body></html>",
    expectedLineAttribs : [ '*0*1*2*3+1+b', '*0*4*2*3+1+i', '*0*1*2*5+1+b', '' ],
    expectedText: ["*should be 1","*should be a bullet","*should be 2", ""]
  },
  testP:{
    description : "A single <p></p> should create a new line",
    html : "<html><body><p></p><p></p></body></html>",
    expectedLineAttribs : [ '', ''],
    expectedText: ["", ""],
    noteToSelf: "<p></p>should create a line break but not break numbering"
  },
  nestedOl: {
    description : "Tests if ols properly get line numbers when in a normal OL",
    html : "<html><body>a<ol><li>b<ol><li>c</li></ol></ol>notlist<p>foo</p></body></html>",
    expectedLineAttribs : [ '+1', '*0*1*2*3+1+1', '*0*4*2*5+1+1', '+7', '+3' ],
    expectedText: ["a","*b","*c", "notlist", "foo"],
    noteToSelf: "Ensure empty P does not induce line attribute marker, wont this break the editor?"
  },
  nestedOl: {
    description : "First item being an UL then subsequent being OL will fail",
    html : "<html><body><ul><li>a<ol><li>b</li><li>c</li></ol></li></ul></body></html>",
    expectedLineAttribs : [ '+1', '*0*1*2*3+1+1', '*0*4*2*5+1+1' ],
    expectedText: ["a","*b","*c"],
    noteToSelf: "Ensure empty P does not induce line attribute marker, wont this break the editor?",
    disabled: true
  },
  lineDontBreakOL:{
    description : "A single completely empty line break within an ol should NOT reset count",
    html : "<html><body><ol><li>should be 1</li><p></p><li>should be 2</li><li>should be 3</li></ol><p></p></body></html>",
    expectedLineAttribs : [ ],
    expectedText: ["*should be 1","*should be 2","*should be 3"],
    noteToSelf: "<p></p>should create a line break but not break numbering -- This is what I can't get working!",
    disabled: true
  }

}

// For each test..
for (let test in tests){
  let testObj = tests[test];

  describe(test, function() {
    if(testObj.disabled){
      return xit("DISABLED:", test, function(done){
        done();
      })
    }

    it(testObj.description, function(done) {
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
        console.error("FAIL: Recieved Text did not match Expected Text\nRecieved:", recievedText[0], "\nExpected:", testObj.expectedText)
        throw new Error();
      }

      // Check recieved attributes matches the expected attributes
      if(arraysEqual(recievedAttributes, expectedAttributes)){
        // console.log("PASS: Recieved Attributes matched Expected Attributes");
        done();
      }else{
        console.error("FAIL", test, testObj.description);
        console.error("FAIL: Recieved Attributes did not match Expected Attributes\nRecieved: ", recievedAttributes, "\nExpected: ", expectedAttributes)
        console.error("FAILING HTML", testObj.html);
        throw new Error();
      }
    });

  });

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
