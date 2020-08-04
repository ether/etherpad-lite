var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var helper = require("./helper.js")
var assertEqualStrings = helper.assertEqualStrings;
var poolOrArray = helper.poolOrArray;
describe("make attribs string",function(){
  it("make attribs string",function(done){
  testMakeAttribsString(1, ['bold,'], '+', [
    ['bold', '']
  ], '');
  testMakeAttribsString(2, ['abc,def', 'bold,'], '=', [
    ['bold', '']
  ], '*1');
  testMakeAttribsString(3, ['abc,def', 'bold,true'], '+', [
    ['abc', 'def'],
    ['bold', 'true']
  ], '*0*1');
  testMakeAttribsString(4, ['abc,def', 'bold,true'], '+', [
    ['bold', 'true'],
    ['abc', 'def']
  ], '*0*1');
  
    done()
  })


})
  function testMakeAttribsString(testId, pool, opcode, attribs, correctString) {

    var p = poolOrArray(pool);
    var str = Changeset.makeAttribsString(opcode, attribs, p);
    assertEqualStrings(correctString, str);
  }

