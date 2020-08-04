
var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var AttributePool = require("ep_etherpad-lite/static/js/AttributePool");
var helper = require("./helper.js")
var assertEqualStrings = helper.assertEqualStrings;
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

  function poolOrArray(attribs) {
    if (attribs.getAttrib) {
      return attribs; // it's already an attrib pool
    } else {
      // assume it's an array of attrib strings to be split and added
      var p = new AttributePool();
      attribs.forEach(function (kv) {
        p.putAttrib(kv.split(','));
      });
      return p;
    }
  }
