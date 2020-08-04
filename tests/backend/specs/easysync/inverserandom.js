var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var helper = require("./helper.js")
var assertEqualArrays = helper.assertEqualArrays;
var random = helper.random;
var poolOrArray = helper.poolOrArray;
var randomMultiline = helper.randomMultiline;
var randomTestChangeset = helper.randomTestChangeset;

describe("inverseRandom",function(){
  it("inverseRandom",function(done){
  
    for (var i = 0; i < 30; i++) testInverseRandom(i);
    done();
  })

})
  function testInverseRandom(randomSeed) {
    var rand = new random();

    var p = poolOrArray(['apple,', 'apple,true', 'banana,', 'banana,true']);

    var startText = randomMultiline(10, 20, rand) + '\n';
    var alines = Changeset.splitAttributionLines(Changeset.makeAttribution(startText), startText);
    var lines = startText.slice(0, -1).split('\n').map(function (s) {
      return s + '\n';
    });

    var stylifier = randomTestChangeset(startText, rand, true)[0];

    //print(alines.join('\n'));
    Changeset.mutateAttributionLines(stylifier, alines, p);
    //print(stylifier);
    //print(alines.join('\n'));
    Changeset.mutateTextLines(stylifier, lines);

    var changeset = randomTestChangeset(lines.join(''), rand, true)[0];
    var inverseChangeset = Changeset.inverse(changeset, lines, alines, p);

    var origLines = lines.slice();
    var origALines = alines.slice();

    Changeset.mutateTextLines(changeset, lines);
    Changeset.mutateAttributionLines(changeset, alines, p);
    //print(origALines.join('\n'));
    //print(changeset);
    //print(inverseChangeset);
    //print(origLines.map(function(s) { return '1: '+s.slice(0,-1); }).join('\n'));
    //print(lines.map(function(s) { return '2: '+s.slice(0,-1); }).join('\n'));
    //print(alines.join('\n'));
    Changeset.mutateTextLines(inverseChangeset, lines);
    Changeset.mutateAttributionLines(inverseChangeset, alines, p);
    //print(lines.map(function(s) { return '3: '+s.slice(0,-1); }).join('\n'));
    assertEqualArrays(origLines, lines);
    assertEqualArrays(origALines, alines);
  }


