
var AttributePool = require("ep_etherpad-lite/static/js/AttributePool");
var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var helper = require("./helper.js")
var assertEqualStrings = helper.assertEqualStrings;

describe("followAttributesTest",function(){

  it("testFollow",function(done){
  
  
    testFollow('', '', '', '', '');
    testFollow('*0', '', '', '*0', '*0');
    testFollow('*0', '*0', '', '', '*0');
    testFollow('*0', '*1', '', '*0', '*0');
    testFollow('*1', '*2', '', '*1', '*1');
    testFollow('*0*1', '', '', '*0*1', '*0*1');
    testFollow('*0*4', '*2*3', '*3', '*0', '*0*3');
    testFollow('*0*4', '*2', '', '*0*4', '*0*4');
    done();
  })

})

    function testFollow(a, b, afb, bfa, merge) {
    var p = new AttributePool();
    p.putAttrib(['x', '']);
    p.putAttrib(['x', 'abc']);
    p.putAttrib(['x', 'def']);
    p.putAttrib(['y', '']);
    p.putAttrib(['y', 'abc']);
    p.putAttrib(['y', 'def']);
      assertEqualStrings(afb, Changeset.followAttributes(a, b, p));
      assertEqualStrings(bfa, Changeset.followAttributes(b, a, p));
      assertEqualStrings(merge, Changeset.composeAttributes(a, afb, true, p));
      assertEqualStrings(merge, Changeset.composeAttributes(b, bfa, true, p));
    }

