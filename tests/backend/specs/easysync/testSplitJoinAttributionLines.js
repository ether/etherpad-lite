var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var helper = require("./helper.js")
var assertEqualStrings = helper.assertEqualStrings;
var assertEqualArrays = helper.assertEqualArrays;
var random = helper.random;
var randomMultiline = helper.randomMultiline;

describe("testSplitJoinAttributionLines",function(){
  it("testSplitJoinAttributionLines",function(done){
    for (var i = 0; i < 10; i++) testSplitJoinAttributionLines(i);
    done();
  })

})
  function testSplitJoinAttributionLines(randomSeed) {
    var rand = new random();

    var doc = randomMultiline(10, 20, rand) + '\n';

    function stringToOps(str) {
      var assem = Changeset.mergingOpAssembler();
      var o = Changeset.newOp('+');
      o.chars = 1;
      for (var i = 0; i < str.length; i++) {
        var c = str.charAt(i);
        o.lines = (c == '\n' ? 1 : 0);
        o.attribs = (c == 'a' || c == 'b' ? '*' + c : '');
        assem.append(o);
      }
      return assem.toString();
    }

    var theJoined = stringToOps(doc);
    var theSplit = doc.match(/[^\n]*\n/g).map(stringToOps);

    assertEqualArrays(theSplit, Changeset.splitAttributionLines(theJoined, doc));
    assertEqualStrings(theJoined, Changeset.joinAttributionLines(theSplit));
  }

