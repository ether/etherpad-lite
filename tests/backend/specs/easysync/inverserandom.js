var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var AttributePool = require("ep_etherpad-lite/static/js/AttributePool");
var helper = require("./helper.js")
var assertEqualArrays = helper.assertEqualArrays;

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

function random() {
  this.nextInt = function (maxValue) {
    return Math.floor(Math.random() * maxValue);
  }

  // maxValue is not used
  this.nextDouble = function (maxValue) {
    return Math.random();
  }
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
  function randomTwoPropAttribs(opcode, rand) {
    // assumes attrib pool like ['apple,','apple,true','banana,','banana,true']
    if (opcode == '-' || rand.nextInt(3)) {
      return '';
      // always true
    } else if (rand.nextInt(3)) {
      if (opcode == '+' || rand.nextInt(2)) {
        return '*' + Changeset.numToString(rand.nextInt(2) * 2 + 1);
      } else {
        return '*' + Changeset.numToString(rand.nextInt(2) * 2);
      }
    } else {
      if (opcode == '+' || rand.nextInt(4) == 0) {
        return '*1*3';
      } else {
        return ['*0*2', '*0*3', '*1*2'][rand.nextInt(3)];
      }
    }
  }

