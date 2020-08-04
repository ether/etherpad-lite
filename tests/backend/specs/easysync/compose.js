var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var AttributePool = require("ep_etherpad-lite/static/js/AttributePool");
var helper = require("./helper.js")
var assertEqualStrings = helper.assertEqualStrings;
var random = helper.random;
var randomMultiline = helper.randomMultiline;
var randomInlineString = helper.randomInlineString;
var randomTestChangeset = helper.randomTestChangeset;

describe("Changeset.compose",function(){
  it("composes all the changesets - BUT THIS only calls applyToText?!?",function(done){
    for (var i = 0; i < 30; i++) testCompose(i);
    done();
  })
  it("simpleComposeAttributesTest",function(done){
    var p = new AttributePool();
    p.putAttrib(['bold', '']);
    p.putAttrib(['bold', 'true']);
    var cs1 = Changeset.checkRep("Z:2>1*1+1*1=1$x");
    var cs2 = Changeset.checkRep("Z:3>0*0|1=3$");
    var cs12 = Changeset.checkRep(Changeset.compose(cs1, cs2, p));
    assertEqualStrings("Z:2>1+1*0|1=2$x", cs12);
    done();
  })

})
function testCompose(randomSeed) {
    var rand = new random();

    var p = new AttributePool();

    var startText = randomMultiline(10, 20, rand) + '\n';

    var x1 = randomTestChangeset(startText, rand);
    var change1 = x1[0];
    var text1 = x1[1];

    var x2 = randomTestChangeset(text1, rand);
    var change2 = x2[0];
    var text2 = x2[1];

    var x3 = randomTestChangeset(text2, rand);
    var change3 = x3[0];
    var text3 = x3[1];

    //print(literal(Changeset.toBaseTen(startText)));
    //print(literal(Changeset.toBaseTen(change1)));
    //print(literal(Changeset.toBaseTen(change2)));
    var change12 = Changeset.checkRep(Changeset.compose(change1, change2, p));
    var change23 = Changeset.checkRep(Changeset.compose(change2, change3, p));
    var change123 = Changeset.checkRep(Changeset.compose(change12, change3, p));
    var change123a = Changeset.checkRep(Changeset.compose(change1, change23, p));
    assertEqualStrings(change123, change123a);

    assertEqualStrings(text2, Changeset.applyToText(change12, startText));
    assertEqualStrings(text3, Changeset.applyToText(change23, text1));
    assertEqualStrings(text3, Changeset.applyToText(change123, startText));
  }

