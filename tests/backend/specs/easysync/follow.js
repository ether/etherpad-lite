var AttributePool = require("ep_etherpad-lite/static/js/AttributePool");
var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var helper = require("./helper.js")
var assertEqualStrings = helper.assertEqualStrings;
var assertEqualArrays = helper.assertEqualArrays;
var random = helper.random;
var randomMultiline = helper.randomMultiline;
var randomTestChangeset = helper.randomTestChangeset;

describe("follow",function(){
  it("follows",function(done){
    for (var i = 0; i < 30; i++) testFollow(i);
    done();
  })
  it("testCharacterRangeFollow",function(done){
    testCharacterRangeFollow(1, 'Z:z>9*0=1=4-3+9=1|1-4-4+1*0+a$123456789abcdefghijk', [7, 10], false, [14, 15]);
    testCharacterRangeFollow(2, "Z:bc<6|x=b4|2-6$", [400, 407], false, [400, 401]);
    testCharacterRangeFollow(3, "Z:4>0-3+3$abc", [0, 3], false, [3, 3]);
    testCharacterRangeFollow(4, "Z:4>0-3+3$abc", [0, 3], true, [0, 0]);
    testCharacterRangeFollow(5, "Z:5>1+1=1-3+3$abcd", [1, 4], false, [5, 5]);
    testCharacterRangeFollow(6, "Z:5>1+1=1-3+3$abcd", [1, 4], true, [2, 2]);
    testCharacterRangeFollow(7, "Z:5>1+1=1-3+3$abcd", [0, 6], false, [1, 7]);
    testCharacterRangeFollow(8, "Z:5>1+1=1-3+3$abcd", [0, 3], false, [1, 2]);
    testCharacterRangeFollow(9, "Z:5>1+1=1-3+3$abcd", [2, 5], false, [5, 6]);
    testCharacterRangeFollow(10, "Z:2>1+1$a", [0, 0], false, [1, 1]);
    testCharacterRangeFollow(11, "Z:2>1+1$a", [0, 0], true, [0, 0]);
    done();
  })

})
  function testCharacterRangeFollow(testId, cs, oldRange, insertionsAfter, correctNewRange) {
    cs = Changeset.checkRep(cs);
    assertEqualArrays(correctNewRange, Changeset.characterRangeFollow(cs, oldRange[0], oldRange[1], insertionsAfter));

  }

  function testFollow(randomSeed) {
    var rand = new random();

    var p = new AttributePool();

    var startText = randomMultiline(10, 20, rand) + '\n';

    var cs1 = randomTestChangeset(startText, rand)[0];
    var cs2 = randomTestChangeset(startText, rand)[0];

    var afb = Changeset.checkRep(Changeset.follow(cs1, cs2, false, p));
    var bfa = Changeset.checkRep(Changeset.follow(cs2, cs1, true, p));

    var merge1 = Changeset.checkRep(Changeset.compose(cs1, afb));
    var merge2 = Changeset.checkRep(Changeset.compose(cs2, bfa));

    assertEqualStrings(merge1, merge2);
  }

