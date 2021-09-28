'use strict';
/**
 * I found this tests in the old Etherpad and used it to test if the Changeset library can be run on
 * node.js. It has no use for ep-lite, but I thought I keep it cause it may help someone to
 * understand the Changeset library
 * https://github.com/ether/pad/blob/master/infrastructure/ace/www/easysync2_tests.js
 */

/*
 * Copyright 2009 Google Inc., 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


const Changeset = require('../static/js/Changeset');
const AttributePool = require('../static/js/AttributePool');

function random() {
  this.nextInt = (maxValue) => Math.floor(Math.random() * maxValue);
  this.nextDouble = (maxValue) => Math.random();
}

const runTests = () => {
  const print = (str) => {
    console.log(str);
  };

  const assert = (code, optMsg) => {
    if (!eval(code)) throw new Error(`FALSE: ${optMsg || code}`); /* eslint-disable-line no-eval */
  };

  const literal = (v) => {
    if ((typeof v) === 'string') {
      return `"${v.replace(/[\\"]/g, '\\$1').replace(/\n/g, '\\n')}"`;
    } else { return JSON.stringify(v); }
  };

  const assertEqualArrays = (a, b) => {
    assert(`JSON.stringify(${literal(a)}) == JSON.stringify(${literal(b)})`);
  };

  const assertEqualStrings = (a, b) => {
    assert(`${literal(a)} == ${literal(b)}`);
  };

  const throughIterator = (opsStr) => {
    const iter = Changeset.opIterator(opsStr);
    const assem = Changeset.opAssembler();
    while (iter.hasNext()) {
      assem.append(iter.next());
    }
    return assem.toString();
  };

  const throughSmartAssembler = (opsStr) => {
    const iter = Changeset.opIterator(opsStr);
    const assem = Changeset.smartOpAssembler();
    while (iter.hasNext()) {
      assem.append(iter.next());
    }
    assem.endDocument();
    return assem.toString();
  };

  (() => {
    print('> throughIterator');
    const x = '-c*3*4+6|3=az*asdf0*1*2*3+1=1-1+1*0+1=1-1+1|c=c-1';
    assert(`throughIterator(${literal(x)}) == ${literal(x)}`);
  })();

  (() => {
    print('> throughSmartAssembler');
    const x = '-c*3*4+6|3=az*asdf0*1*2*3+1=1-1+1*0+1=1-1+1|c=c-1';
    assert(`throughSmartAssembler(${literal(x)}) == ${literal(x)}`);
  })();

  const applyMutations = (mu, arrayOfArrays) => {
    arrayOfArrays.forEach((a) => {
      const result = mu[a[0]].apply(mu, a.slice(1));
      if (a[0] === 'remove' && a[3]) {
        assertEqualStrings(a[3], result);
      }
    });
  };

  const mutationsToChangeset = (oldLen, arrayOfArrays) => {
    const assem = Changeset.smartOpAssembler();
    const op = Changeset.newOp();
    const bank = Changeset.stringAssembler();
    let oldPos = 0;
    let newLen = 0;
    arrayOfArrays.forEach((a) => {
      if (a[0] === 'skip') {
        op.opcode = '=';
        op.chars = a[1];
        op.lines = (a[2] || 0);
        assem.append(op);
        oldPos += op.chars;
        newLen += op.chars;
      } else if (a[0] === 'remove') {
        op.opcode = '-';
        op.chars = a[1];
        op.lines = (a[2] || 0);
        assem.append(op);
        oldPos += op.chars;
      } else if (a[0] === 'insert') {
        op.opcode = '+';
        bank.append(a[1]);
        op.chars = a[1].length;
        op.lines = (a[2] || 0);
        assem.append(op);
        newLen += op.chars;
      }
    });
    newLen += oldLen - oldPos;
    assem.endDocument();
    return Changeset.pack(oldLen, newLen, assem.toString(), bank.toString());
  };

  const runMutationTest = (testId, origLines, muts, correct) => {
    print(`> runMutationTest#${testId}`);
    let lines = origLines.slice();
    const mu = Changeset.textLinesMutator(lines);
    applyMutations(mu, muts);
    mu.close();
    assertEqualArrays(correct, lines);

    const inText = origLines.join('');
    const cs = mutationsToChangeset(inText.length, muts);
    lines = origLines.slice();
    Changeset.mutateTextLines(cs, lines);
    assertEqualArrays(correct, lines);

    const correctText = correct.join('');
    // print(literal(cs));
    const outText = Changeset.applyToText(cs, inText);
    assertEqualStrings(correctText, outText);
  };

  runMutationTest(1, ['apple\n', 'banana\n', 'cabbage\n', 'duffle\n', 'eggplant\n'], [
    ['remove', 1, 0, 'a'],
    ['insert', 'tu'],
    ['remove', 1, 0, 'p'],
    ['skip', 4, 1],
    ['skip', 7, 1],
    ['insert', 'cream\npie\n', 2],
    ['skip', 2],
    ['insert', 'bot'],
    ['insert', '\n', 1],
    ['insert', 'bu'],
    ['skip', 3],
    ['remove', 3, 1, 'ge\n'],
    ['remove', 6, 0, 'duffle'],
  ], ['tuple\n', 'banana\n', 'cream\n', 'pie\n', 'cabot\n', 'bubba\n', 'eggplant\n']);

  runMutationTest(2, ['apple\n', 'banana\n', 'cabbage\n', 'duffle\n', 'eggplant\n'], [
    ['remove', 1, 0, 'a'],
    ['remove', 1, 0, 'p'],
    ['insert', 'tu'],
    ['skip', 11, 2],
    ['insert', 'cream\npie\n', 2],
    ['skip', 2],
    ['insert', 'bot'],
    ['insert', '\n', 1],
    ['insert', 'bu'],
    ['skip', 3],
    ['remove', 3, 1, 'ge\n'],
    ['remove', 6, 0, 'duffle'],
  ], ['tuple\n', 'banana\n', 'cream\n', 'pie\n', 'cabot\n', 'bubba\n', 'eggplant\n']);

  runMutationTest(3, ['apple\n', 'banana\n', 'cabbage\n', 'duffle\n', 'eggplant\n'], [
    ['remove', 6, 1, 'apple\n'],
    ['skip', 15, 2],
    ['skip', 6],
    ['remove', 1, 1, '\n'],
    ['remove', 8, 0, 'eggplant'],
    ['skip', 1, 1],
  ], ['banana\n', 'cabbage\n', 'duffle\n']);

  runMutationTest(4, ['15\n'], [
    ['skip', 1],
    ['insert', '\n2\n3\n4\n', 4],
    ['skip', 2, 1],
  ], ['1\n', '2\n', '3\n', '4\n', '5\n']);

  runMutationTest(5, ['1\n', '2\n', '3\n', '4\n', '5\n'], [
    ['skip', 1],
    ['remove', 7, 4, '\n2\n3\n4\n'],
    ['skip', 2, 1],
  ], ['15\n']);

  runMutationTest(6, ['123\n', 'abc\n', 'def\n', 'ghi\n', 'xyz\n'], [
    ['insert', '0'],
    ['skip', 4, 1],
    ['skip', 4, 1],
    ['remove', 8, 2, 'def\nghi\n'],
    ['skip', 4, 1],
  ], ['0123\n', 'abc\n', 'xyz\n']);

  runMutationTest(7, ['apple\n', 'banana\n', 'cabbage\n', 'duffle\n', 'eggplant\n'], [
    ['remove', 6, 1, 'apple\n'],
    ['skip', 15, 2, true],
    ['skip', 6, 0, true],
    ['remove', 1, 1, '\n'],
    ['remove', 8, 0, 'eggplant'],
    ['skip', 1, 1, true],
  ], ['banana\n', 'cabbage\n', 'duffle\n']);

  const poolOrArray = (attribs) => {
    if (attribs.getAttrib) {
      return attribs; // it's already an attrib pool
    } else {
      // assume it's an array of attrib strings to be split and added
      const p = new AttributePool();
      attribs.forEach((kv) => {
        p.putAttrib(kv.split(','));
      });
      return p;
    }
  };

  const runApplyToAttributionTest = (testId, attribs, cs, inAttr, outCorrect) => {
    print(`> applyToAttribution#${testId}`);
    const p = poolOrArray(attribs);
    const result = Changeset.applyToAttribution(
        Changeset.checkRep(cs), inAttr, p);
    assertEqualStrings(outCorrect, result);
  };

  // turn c<b>a</b>ctus\n into a<b>c</b>tusabcd\n
  runApplyToAttributionTest(1,
      ['bold,', 'bold,true'], 'Z:7>3-1*0=1*1=1=3+4$abcd', '+1*1+1|1+5', '+1*1+1|1+8');

  // turn "david\ngreenspan\n" into "<b>david\ngreen</b>\n"
  runApplyToAttributionTest(2,
      ['bold,', 'bold,true'], 'Z:g<4*1|1=6*1=5-4$', '|2+g', '*1|1+6*1+5|1+1');

  (() => {
    print('> mutatorHasMore');
    const lines = ['1\n', '2\n', '3\n', '4\n'];
    let mu;

    mu = Changeset.textLinesMutator(lines);
    assert(`${mu.hasMore()} == true`);
    mu.skip(8, 4);
    assert(`${mu.hasMore()} == false`);
    mu.close();
    assert(`${mu.hasMore()} == false`);

    // still 1,2,3,4
    mu = Changeset.textLinesMutator(lines);
    assert(`${mu.hasMore()} == true`);
    mu.remove(2, 1);
    assert(`${mu.hasMore()} == true`);
    mu.skip(2, 1);
    assert(`${mu.hasMore()} == true`);
    mu.skip(2, 1);
    assert(`${mu.hasMore()} == true`);
    mu.skip(2, 1);
    assert(`${mu.hasMore()} == false`);
    mu.insert('5\n', 1);
    assert(`${mu.hasMore()} == false`);
    mu.close();
    assert(`${mu.hasMore()} == false`);

    // 2,3,4,5 now
    mu = Changeset.textLinesMutator(lines);
    assert(`${mu.hasMore()} == true`);
    mu.remove(6, 3);
    assert(`${mu.hasMore()} == true`);
    mu.remove(2, 1);
    assert(`${mu.hasMore()} == false`);
    mu.insert('hello\n', 1);
    assert(`${mu.hasMore()} == false`);
    mu.close();
    assert(`${mu.hasMore()} == false`);
  })();

  const runMutateAttributionTest = (testId, attribs, cs, alines, outCorrect) => {
    print(`> runMutateAttributionTest#${testId}`);
    const p = poolOrArray(attribs);
    const alines2 = Array.prototype.slice.call(alines);
    const result = Changeset.mutateAttributionLines(
        Changeset.checkRep(cs), alines2, p);
    assertEqualArrays(outCorrect, alines2);

    print(`> runMutateAttributionTest#${testId}.applyToAttribution`);

    const removeQuestionMarks = (a) => a.replace(/\?/g, '');
    const inMerged = Changeset.joinAttributionLines(alines.map(removeQuestionMarks));
    const correctMerged = Changeset.joinAttributionLines(outCorrect.map(removeQuestionMarks));
    const mergedResult = Changeset.applyToAttribution(cs, inMerged, p);
    assertEqualStrings(correctMerged, mergedResult);
  };

  // turn 123\n 456\n 789\n into 123\n 4<b>5</b>6\n 789\n
  runMutateAttributionTest(1,
      ['bold,true'], 'Z:c>0|1=4=1*0=1$', ['|1+4', '|1+4', '|1+4'], ['|1+4', '+1*0+1|1+2', '|1+4']);

  // make a document bold
  runMutateAttributionTest(2,
      ['bold,true'], 'Z:c>0*0|3=c$', ['|1+4', '|1+4', '|1+4'], ['*0|1+4', '*0|1+4', '*0|1+4']);

  // clear bold on document
  runMutateAttributionTest(3,
      ['bold,', 'bold,true'], 'Z:c>0*0|3=c$',
      ['*1+1+1*1+1|1+1', '+1*1+1|1+2', '*1+1+1*1+1|1+1'], ['|1+4', '|1+4', '|1+4']);

  // add a character on line 3 of a document with 5 blank lines, and make sure
  // the optimization that skips purely-kept lines is working; if any attribution string
  // with a '?' is parsed it will cause an error.
  runMutateAttributionTest(4,
      ['foo,bar', 'line,1', 'line,2', 'line,3', 'line,4', 'line,5'],
      'Z:5>1|2=2+1$x', ['?*1|1+1', '?*2|1+1', '*3|1+1', '?*4|1+1', '?*5|1+1'],
      ['?*1|1+1', '?*2|1+1', '+1*3|1+1', '?*4|1+1', '?*5|1+1']);

  const testPoolWithChars = (() => {
    const p = new AttributePool();
    p.putAttrib(['char', 'newline']);
    for (let i = 1; i < 36; i++) {
      p.putAttrib(['char', Changeset.numToString(i)]);
    }
    p.putAttrib(['char', '']);
    return p;
  })();

  // based on runMutationTest#1
  runMutateAttributionTest(5, testPoolWithChars,
      'Z:11>7-2*t+1*u+1|2=b|2+a=2*b+1*o+1*t+1*0|1+1*b+1*u+1=3|1-3-6$' + 'tucream\npie\nbot\nbu', ['*a+1*p+2*l+1*e+1*0|1+1', '*b+1*a+1*n+1*a+1*n+1*a+1*0|1+1', '*c+1*a+1*b+2*a+1*g+1*e+1*0|1+1', '*d+1*u+1*f+2*l+1*e+1*0|1+1', '*e+1*g+2*p+1*l+1*a+1*n+1*t+1*0|1+1'], ['*t+1*u+1*p+1*l+1*e+1*0|1+1', '*b+1*a+1*n+1*a+1*n+1*a+1*0|1+1', '|1+6', '|1+4', '*c+1*a+1*b+1*o+1*t+1*0|1+1', '*b+1*u+1*b+2*a+1*0|1+1', '*e+1*g+2*p+1*l+1*a+1*n+1*t+1*0|1+1']);

  // based on runMutationTest#3
  runMutateAttributionTest(6, testPoolWithChars,
      'Z:11<f|1-6|2=f=6|1-1-8$', ['*a|1+6', '*b|1+7', '*c|1+8', '*d|1+7', '*e|1+9'],
      ['*b|1+7', '*c|1+8', '*d+6*e|1+1']);

  // based on runMutationTest#4
  runMutateAttributionTest(7, testPoolWithChars, 'Z:3>7=1|4+7$\n2\n3\n4\n',
      ['*1+1*5|1+2'], ['*1+1|1+1', '|1+2', '|1+2', '|1+2', '*5|1+2']);

  // based on runMutationTest#5
  runMutateAttributionTest(8, testPoolWithChars, 'Z:a<7=1|4-7$',
      ['*1|1+2', '*2|1+2', '*3|1+2', '*4|1+2', '*5|1+2'], ['*1+1*5|1+2']);

  // based on runMutationTest#6
  runMutateAttributionTest(9, testPoolWithChars, 'Z:k<7*0+1*10|2=8|2-8$0',
      [
        '*1+1*2+1*3+1|1+1',
        '*a+1*b+1*c+1|1+1',
        '*d+1*e+1*f+1|1+1',
        '*g+1*h+1*i+1|1+1',
        '?*x+1*y+1*z+1|1+1',
      ],
      ['*0+1|1+4', '|1+4', '?*x+1*y+1*z+1|1+1']);

  runMutateAttributionTest(10, testPoolWithChars, 'Z:6>4=1+1=1+1|1=1+1=1*0+1$abcd',
      ['|1+3', '|1+3'], ['|1+5', '+2*0+1|1+2']);


  runMutateAttributionTest(11, testPoolWithChars, 'Z:s>1|1=4=6|1+1$\n',
      ['*0|1+4', '*0|1+8', '*0+5|1+1', '*0|1+1', '*0|1+5', '*0|1+1', '*0|1+1', '*0|1+1', '|1+1'],
      [
        '*0|1+4',
        '*0+6|1+1',
        '*0|1+2',
        '*0+5|1+1',
        '*0|1+1',
        '*0|1+5',
        '*0|1+1',
        '*0|1+1',
        '*0|1+1',
        '|1+1',
      ]);

  const randomInlineString = (len, rand) => {
    const assem = Changeset.stringAssembler();
    for (let i = 0; i < len; i++) {
      assem.append(String.fromCharCode(rand.nextInt(26) + 97));
    }
    return assem.toString();
  };

  const randomMultiline = (approxMaxLines, approxMaxCols, rand) => {
    const numParts = rand.nextInt(approxMaxLines * 2) + 1;
    const txt = Changeset.stringAssembler();
    txt.append(rand.nextInt(2) ? '\n' : '');
    for (let i = 0; i < numParts; i++) {
      if ((i % 2) === 0) {
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
  };

  const randomStringOperation = (numCharsLeft, rand) => {
    let result;
    switch (rand.nextInt(9)) {
      case 0:
      {
        // insert char
        result = {
          insert: randomInlineString(1, rand),
        };
        break;
      }
      case 1:
      {
        // delete char
        result = {
          remove: 1,
        };
        break;
      }
      case 2:
      {
        // skip char
        result = {
          skip: 1,
        };
        break;
      }
      case 3:
      {
        // insert small
        result = {
          insert: randomInlineString(rand.nextInt(4) + 1, rand),
        };
        break;
      }
      case 4:
      {
        // delete small
        result = {
          remove: rand.nextInt(4) + 1,
        };
        break;
      }
      case 5:
      {
        // skip small
        result = {
          skip: rand.nextInt(4) + 1,
        };
        break;
      }
      case 6:
      {
        // insert multiline;
        result = {
          insert: randomMultiline(5, 20, rand),
        };
        break;
      }
      case 7:
      {
        // delete multiline
        result = {
          remove: Math.round(numCharsLeft * rand.nextDouble() * rand.nextDouble()),
        };
        break;
      }
      case 8:
      {
        // skip multiline
        result = {
          skip: Math.round(numCharsLeft * rand.nextDouble() * rand.nextDouble()),
        };
        break;
      }
      case 9:
      {
        // delete to end
        result = {
          remove: numCharsLeft,
        };
        break;
      }
      case 10:
      {
        // skip to end
        result = {
          skip: numCharsLeft,
        };
        break;
      }
    }
    const maxOrig = numCharsLeft - 1;
    if ('remove' in result) {
      result.remove = Math.min(result.remove, maxOrig);
    } else if ('skip' in result) {
      result.skip = Math.min(result.skip, maxOrig);
    }
    return result;
  };

  const randomTwoPropAttribs = (opcode, rand) => {
    // assumes attrib pool like ['apple,','apple,true','banana,','banana,true']
    if (opcode === '-' || rand.nextInt(3)) {
      return '';
    } else if (rand.nextInt(3)) {
      if (opcode === '+' || rand.nextInt(2)) {
        return `*${Changeset.numToString(rand.nextInt(2) * 2 + 1)}`;
      } else {
        return `*${Changeset.numToString(rand.nextInt(2) * 2)}`;
      }
    } else if (opcode === '+' || rand.nextInt(4) === 0) {
      return '*1*3';
    } else {
      return ['*0*2', '*0*3', '*1*2'][rand.nextInt(3)];
    }
  };

  const randomTestChangeset = (origText, rand, withAttribs) => {
    const charBank = Changeset.stringAssembler();
    let textLeft = origText; // always keep final newline
    const outTextAssem = Changeset.stringAssembler();
    const opAssem = Changeset.smartOpAssembler();
    const oldLen = origText.length;

    const nextOp = Changeset.newOp();

    const appendMultilineOp = (opcode, txt) => {
      nextOp.opcode = opcode;
      if (withAttribs) {
        nextOp.attribs = randomTwoPropAttribs(opcode, rand);
      }
      txt.replace(/\n|[^\n]+/g, (t) => {
        if (t === '\n') {
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
    };

    const doOp = () => {
      const o = randomStringOperation(textLeft.length, rand);
      if (o.insert) {
        const txt = o.insert;
        charBank.append(txt);
        outTextAssem.append(txt);
        appendMultilineOp('+', txt);
      } else if (o.skip) {
        const txt = textLeft.substring(0, o.skip);
        textLeft = textLeft.substring(o.skip);
        outTextAssem.append(txt);
        appendMultilineOp('=', txt);
      } else if (o.remove) {
        const txt = textLeft.substring(0, o.remove);
        textLeft = textLeft.substring(o.remove);
        appendMultilineOp('-', txt);
      }
    };

    while (textLeft.length > 1) doOp();
    for (let i = 0; i < 5; i++) doOp(); // do some more (only insertions will happen)
    const outText = `${outTextAssem.toString()}\n`;
    opAssem.endDocument();
    const cs = Changeset.pack(oldLen, outText.length, opAssem.toString(), charBank.toString());
    Changeset.checkRep(cs);
    return [cs, outText];
  };

  const testCompose = (randomSeed) => {
    const rand = new random();
    print(`> testCompose#${randomSeed}`);

    const p = new AttributePool();

    const startText = `${randomMultiline(10, 20, rand)}\n`;

    const x1 = randomTestChangeset(startText, rand);
    const change1 = x1[0];
    const text1 = x1[1];

    const x2 = randomTestChangeset(text1, rand);
    const change2 = x2[0];
    const text2 = x2[1];

    const x3 = randomTestChangeset(text2, rand);
    const change3 = x3[0];
    const text3 = x3[1];

    // print(literal(Changeset.toBaseTen(startText)));
    // print(literal(Changeset.toBaseTen(change1)));
    // print(literal(Changeset.toBaseTen(change2)));
    const change12 = Changeset.checkRep(Changeset.compose(change1, change2, p));
    const change23 = Changeset.checkRep(Changeset.compose(change2, change3, p));
    const change123 = Changeset.checkRep(Changeset.compose(change12, change3, p));
    const change123a = Changeset.checkRep(Changeset.compose(change1, change23, p));
    assertEqualStrings(change123, change123a);

    assertEqualStrings(text2, Changeset.applyToText(change12, startText));
    assertEqualStrings(text3, Changeset.applyToText(change23, text1));
    assertEqualStrings(text3, Changeset.applyToText(change123, startText));
  };

  for (let i = 0; i < 30; i++) testCompose(i);

  (function simpleComposeAttributesTest() {
    print('> simpleComposeAttributesTest');
    const p = new AttributePool();
    p.putAttrib(['bold', '']);
    p.putAttrib(['bold', 'true']);
    const cs1 = Changeset.checkRep('Z:2>1*1+1*1=1$x');
    const cs2 = Changeset.checkRep('Z:3>0*0|1=3$');
    const cs12 = Changeset.checkRep(Changeset.compose(cs1, cs2, p));
    assertEqualStrings('Z:2>1+1*0|1=2$x', cs12);
  })();

  (function followAttributesTest() {
    const p = new AttributePool();
    p.putAttrib(['x', '']);
    p.putAttrib(['x', 'abc']);
    p.putAttrib(['x', 'def']);
    p.putAttrib(['y', '']);
    p.putAttrib(['y', 'abc']);
    p.putAttrib(['y', 'def']);

    const testFollow = (a, b, afb, bfa, merge) => {
      assertEqualStrings(afb, Changeset.followAttributes(a, b, p));
      assertEqualStrings(bfa, Changeset.followAttributes(b, a, p));
      assertEqualStrings(merge, Changeset.composeAttributes(a, afb, true, p));
      assertEqualStrings(merge, Changeset.composeAttributes(b, bfa, true, p));
    };

    testFollow('', '', '', '', '');
    testFollow('*0', '', '', '*0', '*0');
    testFollow('*0', '*0', '', '', '*0');
    testFollow('*0', '*1', '', '*0', '*0');
    testFollow('*1', '*2', '', '*1', '*1');
    testFollow('*0*1', '', '', '*0*1', '*0*1');
    testFollow('*0*4', '*2*3', '*3', '*0', '*0*3');
    testFollow('*0*4', '*2', '', '*0*4', '*0*4');
  })();

  const testFollow = (randomSeed) => {
    const rand = new random();
    print(`> testFollow#${randomSeed}`);

    const p = new AttributePool();

    const startText = `${randomMultiline(10, 20, rand)}\n`;

    const cs1 = randomTestChangeset(startText, rand)[0];
    const cs2 = randomTestChangeset(startText, rand)[0];

    const afb = Changeset.checkRep(Changeset.follow(cs1, cs2, false, p));
    const bfa = Changeset.checkRep(Changeset.follow(cs2, cs1, true, p));

    const merge1 = Changeset.checkRep(Changeset.compose(cs1, afb));
    const merge2 = Changeset.checkRep(Changeset.compose(cs2, bfa));

    assertEqualStrings(merge1, merge2);
  };

  for (let i = 0; i < 30; i++) testFollow(i);

  const testSplitJoinAttributionLines = (randomSeed) => {
    const rand = new random();
    print(`> testSplitJoinAttributionLines#${randomSeed}`);

    const doc = `${randomMultiline(10, 20, rand)}\n`;

    const stringToOps = (str) => {
      const assem = Changeset.mergingOpAssembler();
      const o = Changeset.newOp('+');
      o.chars = 1;
      for (let i = 0; i < str.length; i++) {
        const c = str.charAt(i);
        o.lines = (c === '\n' ? 1 : 0);
        o.attribs = (c === 'a' || c === 'b' ? `*${c}` : '');
        assem.append(o);
      }
      return assem.toString();
    };

    const theJoined = stringToOps(doc);
    const theSplit = doc.match(/[^\n]*\n/g).map(stringToOps);

    assertEqualArrays(theSplit, Changeset.splitAttributionLines(theJoined, doc));
    assertEqualStrings(theJoined, Changeset.joinAttributionLines(theSplit));
  };

  for (let i = 0; i < 10; i++) testSplitJoinAttributionLines(i);

  (function testMoveOpsToNewPool() {
    print('> testMoveOpsToNewPool');

    const pool1 = new AttributePool();
    const pool2 = new AttributePool();

    pool1.putAttrib(['baz', 'qux']);
    pool1.putAttrib(['foo', 'bar']);

    pool2.putAttrib(['foo', 'bar']);

    assertEqualStrings(
        Changeset.moveOpsToNewPool('Z:1>2*1+1*0+1$ab', pool1, pool2), 'Z:1>2*0+1*1+1$ab');
    assertEqualStrings(
        Changeset.moveOpsToNewPool('*1+1*0+1', pool1, pool2), '*0+1*1+1');
  })();


  (function testMakeSplice() {
    print('> testMakeSplice');

    const t = 'a\nb\nc\n';
    const t2 = Changeset.applyToText(Changeset.makeSplice(t, 5, 0, 'def'), t);
    assertEqualStrings('a\nb\ncdef\n', t2);
  })();

  (function testToSplices() {
    print('> testToSplices');

    const cs = Changeset.checkRep('Z:z>9*0=1=4-3+9=1|1-4-4+1*0+a$123456789abcdefghijk');
    const correctSplices = [
      [5, 8, '123456789'],
      [9, 17, 'abcdefghijk'],
    ];
    assertEqualArrays(correctSplices, Changeset.toSplices(cs));
  })();

  const testCharacterRangeFollow = (testId, cs, oldRange, insertionsAfter, correctNewRange) => {
    print(`> testCharacterRangeFollow#${testId}`);
    cs = Changeset.checkRep(cs);
    assertEqualArrays(correctNewRange, Changeset.characterRangeFollow(
        cs, oldRange[0], oldRange[1], insertionsAfter));
  };

  testCharacterRangeFollow(1, 'Z:z>9*0=1=4-3+9=1|1-4-4+1*0+a$123456789abcdefghijk',
      [7, 10], false, [14, 15]);
  testCharacterRangeFollow(2, 'Z:bc<6|x=b4|2-6$', [400, 407], false, [400, 401]);
  testCharacterRangeFollow(3, 'Z:4>0-3+3$abc', [0, 3], false, [3, 3]);
  testCharacterRangeFollow(4, 'Z:4>0-3+3$abc', [0, 3], true, [0, 0]);
  testCharacterRangeFollow(5, 'Z:5>1+1=1-3+3$abcd', [1, 4], false, [5, 5]);
  testCharacterRangeFollow(6, 'Z:5>1+1=1-3+3$abcd', [1, 4], true, [2, 2]);
  testCharacterRangeFollow(7, 'Z:5>1+1=1-3+3$abcd', [0, 6], false, [1, 7]);
  testCharacterRangeFollow(8, 'Z:5>1+1=1-3+3$abcd', [0, 3], false, [1, 2]);
  testCharacterRangeFollow(9, 'Z:5>1+1=1-3+3$abcd', [2, 5], false, [5, 6]);
  testCharacterRangeFollow(10, 'Z:2>1+1$a', [0, 0], false, [1, 1]);
  testCharacterRangeFollow(11, 'Z:2>1+1$a', [0, 0], true, [0, 0]);

  (function testOpAttributeValue() {
    print('> testOpAttributeValue');

    const p = new AttributePool();
    p.putAttrib(['name', 'david']);
    p.putAttrib(['color', 'green']);

    assertEqualStrings('david',
        Changeset.opAttributeValue(Changeset.stringOp('*0*1+1'), 'name', p));
    assertEqualStrings('david',
        Changeset.opAttributeValue(Changeset.stringOp('*0+1'), 'name', p));
    assertEqualStrings('',
        Changeset.opAttributeValue(Changeset.stringOp('*1+1'), 'name', p));
    assertEqualStrings('',
        Changeset.opAttributeValue(Changeset.stringOp('+1'), 'name', p));
    assertEqualStrings('green',
        Changeset.opAttributeValue(Changeset.stringOp('*0*1+1'), 'color', p));
    assertEqualStrings('green',
        Changeset.opAttributeValue(Changeset.stringOp('*1+1'), 'color', p));
    assertEqualStrings('',
        Changeset.opAttributeValue(Changeset.stringOp('*0+1'), 'color', p));
    assertEqualStrings('',
        Changeset.opAttributeValue(Changeset.stringOp('+1'), 'color', p));
  })();

  const testAppendATextToAssembler = (testId, atext, correctOps) => {
    print(`> testAppendATextToAssembler#${testId}`);

    const assem = Changeset.smartOpAssembler();
    Changeset.appendATextToAssembler(atext, assem);
    assertEqualStrings(correctOps, assem.toString());
  };

  testAppendATextToAssembler(1, {
    text: '\n',
    attribs: '|1+1',
  }, '');
  testAppendATextToAssembler(2, {
    text: '\n\n',
    attribs: '|2+2',
  }, '|1+1');
  testAppendATextToAssembler(3, {
    text: '\n\n',
    attribs: '*x|2+2',
  }, '*x|1+1');
  testAppendATextToAssembler(4, {
    text: '\n\n',
    attribs: '*x|1+1|1+1',
  }, '*x|1+1');
  testAppendATextToAssembler(5, {
    text: 'foo\n',
    attribs: '|1+4',
  }, '+3');
  testAppendATextToAssembler(6, {
    text: '\nfoo\n',
    attribs: '|2+5',
  }, '|1+1+3');
  testAppendATextToAssembler(7, {
    text: '\nfoo\n',
    attribs: '*x|2+5',
  }, '*x|1+1*x+3');
  testAppendATextToAssembler(8, {
    text: '\n\n\nfoo\n',
    attribs: '|2+2*x|2+5',
  }, '|2+2*x|1+1*x+3');

  const testMakeAttribsString = (testId, pool, opcode, attribs, correctString) => {
    print(`> testMakeAttribsString#${testId}`);

    const p = poolOrArray(pool);
    const str = Changeset.makeAttribsString(opcode, attribs, p);
    assertEqualStrings(correctString, str);
  };

  testMakeAttribsString(1, ['bold,'], '+', [
    ['bold', ''],
  ], '');
  testMakeAttribsString(2, ['abc,def', 'bold,'], '=', [
    ['bold', ''],
  ], '*1');
  testMakeAttribsString(3, ['abc,def', 'bold,true'], '+', [
    ['abc', 'def'],
    ['bold', 'true'],
  ], '*0*1');
  testMakeAttribsString(4, ['abc,def', 'bold,true'], '+', [
    ['bold', 'true'],
    ['abc', 'def'],
  ], '*0*1');

  const testSubattribution = (testId, astr, start, end, correctOutput) => {
    print(`> testSubattribution#${testId}`);

    const str = Changeset.subattribution(astr, start, end);
    assertEqualStrings(correctOutput, str);
  };

  testSubattribution(1, '+1', 0, 0, '');
  testSubattribution(2, '+1', 0, 1, '+1');
  testSubattribution(3, '+1', 0, undefined, '+1');
  testSubattribution(4, '|1+1', 0, 0, '');
  testSubattribution(5, '|1+1', 0, 1, '|1+1');
  testSubattribution(6, '|1+1', 0, undefined, '|1+1');
  testSubattribution(7, '*0+1', 0, 0, '');
  testSubattribution(8, '*0+1', 0, 1, '*0+1');
  testSubattribution(9, '*0+1', 0, undefined, '*0+1');
  testSubattribution(10, '*0|1+1', 0, 0, '');
  testSubattribution(11, '*0|1+1', 0, 1, '*0|1+1');
  testSubattribution(12, '*0|1+1', 0, undefined, '*0|1+1');
  testSubattribution(13, '*0+2+1*1+3', 0, 1, '*0+1');
  testSubattribution(14, '*0+2+1*1+3', 0, 2, '*0+2');
  testSubattribution(15, '*0+2+1*1+3', 0, 3, '*0+2+1');
  testSubattribution(16, '*0+2+1*1+3', 0, 4, '*0+2+1*1+1');
  testSubattribution(17, '*0+2+1*1+3', 0, 5, '*0+2+1*1+2');
  testSubattribution(18, '*0+2+1*1+3', 0, 6, '*0+2+1*1+3');
  testSubattribution(19, '*0+2+1*1+3', 0, 7, '*0+2+1*1+3');
  testSubattribution(20, '*0+2+1*1+3', 0, undefined, '*0+2+1*1+3');
  testSubattribution(21, '*0+2+1*1+3', 1, undefined, '*0+1+1*1+3');
  testSubattribution(22, '*0+2+1*1+3', 2, undefined, '+1*1+3');
  testSubattribution(23, '*0+2+1*1+3', 3, undefined, '*1+3');
  testSubattribution(24, '*0+2+1*1+3', 4, undefined, '*1+2');
  testSubattribution(25, '*0+2+1*1+3', 5, undefined, '*1+1');
  testSubattribution(26, '*0+2+1*1+3', 6, undefined, '');
  testSubattribution(27, '*0+2+1*1|1+3', 0, 1, '*0+1');
  testSubattribution(28, '*0+2+1*1|1+3', 0, 2, '*0+2');
  testSubattribution(29, '*0+2+1*1|1+3', 0, 3, '*0+2+1');
  testSubattribution(30, '*0+2+1*1|1+3', 0, 4, '*0+2+1*1+1');
  testSubattribution(31, '*0+2+1*1|1+3', 0, 5, '*0+2+1*1+2');
  testSubattribution(32, '*0+2+1*1|1+3', 0, 6, '*0+2+1*1|1+3');
  testSubattribution(33, '*0+2+1*1|1+3', 0, 7, '*0+2+1*1|1+3');
  testSubattribution(34, '*0+2+1*1|1+3', 0, undefined, '*0+2+1*1|1+3');
  testSubattribution(35, '*0+2+1*1|1+3', 1, undefined, '*0+1+1*1|1+3');
  testSubattribution(36, '*0+2+1*1|1+3', 2, undefined, '+1*1|1+3');
  testSubattribution(37, '*0+2+1*1|1+3', 3, undefined, '*1|1+3');
  testSubattribution(38, '*0+2+1*1|1+3', 4, undefined, '*1|1+2');
  testSubattribution(39, '*0+2+1*1|1+3', 5, undefined, '*1|1+1');
  testSubattribution(40, '*0+2+1*1|1+3', 1, 5, '*0+1+1*1+2');
  testSubattribution(41, '*0+2+1*1|1+3', 2, 6, '+1*1|1+3');
  testSubattribution(42, '*0+2+1*1+3', 2, 6, '+1*1+3');

  const testFilterAttribNumbers = (testId, cs, filter, correctOutput) => {
    print(`> testFilterAttribNumbers#${testId}`);

    const str = Changeset.filterAttribNumbers(cs, filter);
    assertEqualStrings(correctOutput, str);
  };

  testFilterAttribNumbers(1, '*0*1+1+2+3*1+4*2+5*0*2*1*b*c+6',
      (n) => (n % 2) === 0, '*0+1+2+3+4*2+5*0*2*c+6');
  testFilterAttribNumbers(2, '*0*1+1+2+3*1+4*2+5*0*2*1*b*c+6',
      (n) => (n % 2) === 1, '*1+1+2+3*1+4+5*1*b+6');

  const testInverse = (testId, cs, lines, alines, pool, correctOutput) => {
    print(`> testInverse#${testId}`);

    pool = poolOrArray(pool);
    const str = Changeset.inverse(Changeset.checkRep(cs), lines, alines, pool);
    assertEqualStrings(correctOutput, str);
  };

  // take "FFFFTTTTT" and apply "-FT--FFTT", the inverse of which is "--F--TT--"
  testInverse(1, 'Z:9>0=1*0=1*1=1=2*0=2*1|1=2$', null,
      ['+4*1+5'], ['bold,', 'bold,true'], 'Z:9>0=2*0=1=2*1=2$');

  const testMutateTextLines = (testId, cs, lines, correctLines) => {
    print(`> testMutateTextLines#${testId}`);

    const a = lines.slice();
    Changeset.mutateTextLines(cs, a);
    assertEqualArrays(correctLines, a);
  };

  testMutateTextLines(1, 'Z:4<1|1-2-1|1+1+1$\nc', ['a\n', 'b\n'], ['\n', 'c\n']);
  testMutateTextLines(2, 'Z:4>0|1-2-1|2+3$\nc\n', ['a\n', 'b\n'], ['\n', 'c\n', '\n']);

  const testInverseRandom = (randomSeed) => {
    const rand = new random();
    print(`> testInverseRandom#${randomSeed}`);

    const p = poolOrArray(['apple,', 'apple,true', 'banana,', 'banana,true']);

    const startText = `${randomMultiline(10, 20, rand)}\n`;
    const alines = Changeset.splitAttributionLines(Changeset.makeAttribution(startText), startText);
    const lines = startText.slice(0, -1).split('\n').map((s) => `${s}\n`);

    const stylifier = randomTestChangeset(startText, rand, true)[0];

    // print(alines.join('\n'));
    Changeset.mutateAttributionLines(stylifier, alines, p);
    // print(stylifier);
    // print(alines.join('\n'));
    Changeset.mutateTextLines(stylifier, lines);

    const changeset = randomTestChangeset(lines.join(''), rand, true)[0];
    const inverseChangeset = Changeset.inverse(changeset, lines, alines, p);

    const origLines = lines.slice();
    const origALines = alines.slice();

    Changeset.mutateTextLines(changeset, lines);
    Changeset.mutateAttributionLines(changeset, alines, p);
    // print(origALines.join('\n'));
    // print(changeset);
    // print(inverseChangeset);
    // print(origLines.map(function(s) { return '1: '+s.slice(0,-1); }).join('\n'));
    // print(lines.map(function(s) { return '2: '+s.slice(0,-1); }).join('\n'));
    // print(alines.join('\n'));
    Changeset.mutateTextLines(inverseChangeset, lines);
    Changeset.mutateAttributionLines(inverseChangeset, alines, p);
    // print(lines.map(function(s) { return '3: '+s.slice(0,-1); }).join('\n'));
    assertEqualArrays(origLines, lines);
    assertEqualArrays(origALines, alines);
  };

  for (let i = 0; i < 30; i++) testInverseRandom(i);
};

runTests();
