

var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var AttributePool = require("ep_etherpad-lite/static/js/AttributePool");
var helper = require("./helper.js")
var assertEqualStrings = helper.assertEqualStrings;
var assertEqualArrays = helper.assertEqualArrays;

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

function random() {
  this.nextInt = function (maxValue) {
    return Math.floor(Math.random() * maxValue);
  }
}
  function randomMultiline(approxMaxLines, approxMaxCols, rand) {
    var numParts = rand.nextInt(approxMaxLines * 2) + 1;
    var txt = Changeset.stringAssembler();
    txt.append(rand.nextInt(2) ? '\n' : '');
    for (var i = 0; i < numParts; i++) {
      if ((i % 2) == 0) {
        if (rand.nextInt(10)) {
          txt.append(randomInlineString(rand.nextInt(approxMaxCols) + 1, rand));
        } else {
          txt.append('\n');
        }
      } else {
        txt.append('\n');
      }
    }
    return txt.toString();
  }
  function randomInlineString(len, rand) {
    var assem = Changeset.stringAssembler();
    for (var i = 0; i < len; i++) {
      assem.append(String.fromCharCode(rand.nextInt(26) + 97));
    }
    return assem.toString();
  }
