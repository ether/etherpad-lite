
var AttributePool = require("ep_etherpad-lite/static/js/AttributePool");
var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var helper = require("./helper.js")
var assertEqualStrings = helper.assertEqualStrings;


describe("moveOpsToNewPool",function(){
  it("moveOpsToNewPool",function(done){
  

    var pool1 = new AttributePool();
    var pool2 = new AttributePool();

    pool1.putAttrib(['baz', 'qux']);
    pool1.putAttrib(['foo', 'bar']);

    pool2.putAttrib(['foo', 'bar']);

    assertEqualStrings(Changeset.moveOpsToNewPool('Z:1>2*1+1*0+1$ab', pool1, pool2), 'Z:1>2*0+1*1+1$ab');
    assertEqualStrings(Changeset.moveOpsToNewPool('*1+1*0+1', pool1, pool2), '*0+1*1+1');
    done();
  })
})
