var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var AttributePool = require("ep_etherpad-lite/static/js/AttributePool");
var helper = require("./helper.js")
var assertEqualStrings = helper.assertEqualStrings;

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
        txt = textLeft.substring(0, o.skip);
        textLeft = textLeft.substring(o.skip);
        outTextAssem.append(txt);
        appendMultilineOp('=', txt);
      } else if (o.remove) {
        txt = textLeft.substring(0, o.remove);
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
