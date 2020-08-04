var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var helper = require("./helper.js")
var assertEqualStrings = helper.assertEqualStrings;

describe("testAppendATextToAssembler",function(){
  it("testAppendATextToAssembler",function(done){
  
  testAppendATextToAssembler(1, {
    text: "\n",
    attribs: "|1+1"
  }, "");
  testAppendATextToAssembler(2, {
    text: "\n\n",
    attribs: "|2+2"
  }, "|1+1");
  testAppendATextToAssembler(3, {
    text: "\n\n",
    attribs: "*x|2+2"
  }, "*x|1+1");
  testAppendATextToAssembler(4, {
    text: "\n\n",
    attribs: "*x|1+1|1+1"
  }, "*x|1+1");
  testAppendATextToAssembler(5, {
    text: "foo\n",
    attribs: "|1+4"
  }, "+3");
  testAppendATextToAssembler(6, {
    text: "\nfoo\n",
    attribs: "|2+5"
  }, "|1+1+3");
  testAppendATextToAssembler(7, {
    text: "\nfoo\n",
    attribs: "*x|2+5"
  }, "*x|1+1*x+3");
  testAppendATextToAssembler(8, {
    text: "\n\n\nfoo\n",
    attribs: "|2+2*x|2+5"
  }, "|2+2*x|1+1*x+3");
  
    done();
  })

})
  function testAppendATextToAssembler(testId, atext, correctOps) {

    var assem = Changeset.smartOpAssembler();
    Changeset.appendATextToAssembler(atext, assem);
    assertEqualStrings(correctOps, assem.toString());
  }

