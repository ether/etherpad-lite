var AttributePool = require("ep_etherpad-lite/static/js/AttributePool");
var Changeset = require("ep_etherpad-lite/static/js/Changeset")

exports.assert = function (code, optMsg) {
    if (!eval(code)) throw new Error("FALSE: " + (optMsg || code));
};

exports.literal = function (v) {
    if ((typeof v) == "string") {
      return '"' + v.replace(/[\\\"]/g, '\\$1').replace(/\n/g, '\\n') + '"';
    } else
    return JSON.stringify(v);
}

exports.assertEqualArrays = function (a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

exports.assertEqualStrings = function (a, b) {
    return a === b
}

// not used
exports.throughIterator = function (opsStr) {
    var iter = Changeset.opIterator(opsStr);
    var assem = Changeset.opAssembler();
    while (iter.hasNext()) {
      assem.append(iter.next());
    }
    return assem.toString();
}

// not used
exports.throughSmartAssembler =  function (opsStr) {
    var iter = Changeset.opIterator(opsStr);
    var assem = Changeset.smartOpAssembler();
    while (iter.hasNext()) {
      assem.append(iter.next());
    }
    assem.endDocument();
    return assem.toString();
}
exports.poolOrArray = function (attribs) {
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
exports.random = function () {
  this.nextInt = function (maxValue) {
    return Math.floor(Math.random() * maxValue);
  }

  // maxValue is not used
  this.nextDouble = function (maxValue) {
    return Math.random();
  }
}
exports.randomInlineString = function (len, rand) {
  var assem = Changeset.stringAssembler();
  for (var i = 0; i < len; i++) {
    assem.append(String.fromCharCode(rand.nextInt(26) + 97));
  }
  return assem.toString();
}

exports.randomMultiline = function (approxMaxLines, approxMaxCols, rand) {
  var numParts = rand.nextInt(approxMaxLines * 2) + 1;
  var txt = Changeset.stringAssembler();
  txt.append(rand.nextInt(2) ? '\n' : '');
  for (var i = 0; i < numParts; i++) {
    if ((i % 2) == 0) {
      if (rand.nextInt(10)) {
        txt.append(exports.randomInlineString(rand.nextInt(approxMaxCols) + 1, rand));
      } else {
        txt.append('\n');
      }
    } else {
      txt.append('\n');
    }
  }
  return txt.toString();
}

exports.randomStringOperation = function (numCharsLeft, rand) {
  var result;
  switch (rand.nextInt(9)) {
  case 0:
    {
      // insert char
      result = {
        insert: exports.randomInlineString(1, rand)
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
        insert: exports.randomInlineString(rand.nextInt(4) + 1, rand)
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
        insert: exports.randomMultiline(5, 20, rand)
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
  // this is never tested
  case 9:
    {
      // delete to end
      result = {
        remove: numCharsLeft
      };
      break;
    }
  // this is never tested
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

exports.randomTwoPropAttribs = function (opcode, rand) {
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

exports.randomTestChangeset = function (origText, rand, withAttribs) {
  var charBank = Changeset.stringAssembler();
  var textLeft = origText; // always keep final newline
  var outTextAssem = Changeset.stringAssembler();
  var opAssem = Changeset.smartOpAssembler();
  var oldLen = origText.length;

  var nextOp = Changeset.newOp();

  function appendMultilineOp(opcode, txt) {
    nextOp.opcode = opcode;
    if (withAttribs) {
      nextOp.attribs = exports.randomTwoPropAttribs(opcode, rand);
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
    var o = exports.randomStringOperation(textLeft.length, rand);
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
