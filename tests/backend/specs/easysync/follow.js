var AttributePool = require("ep_etherpad-lite/static/js/AttributePool");
var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var helper = require("./helper.js")
var assertEqualStrings = helper.assertEqualStrings;
var assertEqualArrays = helper.assertEqualArrays;

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

    var cs = Changeset.checkRep(cs);
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

function random() {
  this.nextInt = function (maxValue) {
    return Math.floor(Math.random() * maxValue);
  }

  // maxValue is not used
  this.nextDouble = function (maxValue) {
    return Math.random();
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
  function randomTestChangeset(origText, rand, withAttribs) {
    var charBank = Changeset.stringAssembler();
    var textLeft = origText; // always keep final newline
    var outTextAssem = Changeset.stringAssembler();
    var opAssem = Changeset.smartOpAssembler();
    var oldLen = origText.length;

    var nextOp = Changeset.newOp();

    function appendMultilineOp(opcode, txt) {
      nextOp.opcode = opcode;
      if (withAttribs) {
        nextOp.attribs = randomTwoPropAttribs(opcode, rand);
      }
      txt.replace(/\n|[^\n]+/g, function (t) {
        if (t == '\n') {
          nextOp.chars = 1;
          nextOp.lines = 1;
          opAssem.append(nextOp);
        } else {
          nextOp.chars = t.length;
          nextOp.lines = 0;
          opAssem.append(nextOp);
        }
        return '';
      });
    }

    function doOp() {
      var o = randomStringOperation(textLeft.length, rand);
      if (o.insert) {
        var txt = o.insert;
        charBank.append(txt);
        outTextAssem.append(txt);
        appendMultilineOp('+', txt);
      } else if (o.skip) {
        var txt = textLeft.substring(0, o.skip);
        textLeft = textLeft.substring(o.skip);
        outTextAssem.append(txt);
        appendMultilineOp('=', txt);
      } else if (o.remove) {
        var txt = textLeft.substring(0, o.remove);
        textLeft = textLeft.substring(o.remove);
        appendMultilineOp('-', txt);
      }
    }

    while (textLeft.length > 1) doOp();
    for (var i = 0; i < 5; i++) doOp(); // do some more (only insertions will happen)
    var outText = outTextAssem.toString() + '\n';
    opAssem.endDocument();
    var cs = Changeset.pack(oldLen, outText.length, opAssem.toString(), charBank.toString());
    Changeset.checkRep(cs);
    return [cs, outText];
  }
  function randomStringOperation(numCharsLeft, rand) {
    var result;
    switch (rand.nextInt(9)) {
    case 0:
      {
        // insert char
        result = {
          insert: randomInlineString(1, rand)
        };
        break;
      }
    case 1:
      {
        // delete char
        result = {
          remove: 1
        };
        break;
      }
    case 2:
      {
        // skip char
        result = {
          skip: 1
        };
        break;
      }
    case 3:
      {
        // insert small
        result = {
          insert: randomInlineString(rand.nextInt(4) + 1, rand)
        };
        break;
      }
    case 4:
      {
        // delete small
        result = {
          remove: rand.nextInt(4) + 1
        };
        break;
      }
    case 5:
      {
        // skip small
        result = {
          skip: rand.nextInt(4) + 1
        };
        break;
      }
    case 6:
      {
        // insert multiline;
        result = {
          insert: randomMultiline(5, 20, rand)
        };
        break;
      }
    case 7:
      {
        // delete multiline
        result = {
          remove: Math.round(numCharsLeft * rand.nextDouble() * rand.nextDouble())
        };
        break;
      }
    case 8:
      {
        // skip multiline
        result = {
          skip: Math.round(numCharsLeft * rand.nextDouble() * rand.nextDouble())
        };
        break;
      }
    case 9:
      {
        // delete to end
        result = {
          remove: numCharsLeft
        };
        break;
      }
    case 10:
      {
        // skip to end
        result = {
          skip: numCharsLeft
        };
        break;
      }
    }
    var maxOrig = numCharsLeft - 1;
    if ('remove' in result) {
      result.remove = Math.min(result.remove, maxOrig);
    } else if ('skip' in result) {
      result.skip = Math.min(result.skip, maxOrig);
    }
    return result;
  }
