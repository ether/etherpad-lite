var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var helper = require("./helper.js")
var assertEqualStrings = helper.assertEqualStrings;
var assertEqualArrays = helper.assertEqualArrays;
var assert = helper.assert;

describe("text line mutations",function(){
  it("applies mutations to an array of lines #1",function(done){
    var expected = ["tuple\n", "banana\n", "cream\n", "pie\n", "cabot\n", "bubba\n", "eggplant\n"];
    var result = runMutationTest(["apple\n", "banana\n", "cabbage\n", "duffle\n", "eggplant\n"], [
      ['remove', 1, 0, "a"],
      ['insert', "tu"],
      ['remove', 1, 0, "p"],
      ['skip', 4, 1],
      ['skip', 7, 1],
      ['insert', "cream\npie\n", 2],
      ['skip', 2],
      ['insert', "bot"],
      ['insert', "\n", 1],
      ['insert', "bu"],
      ['skip', 3],
      ['remove', 3, 1, "ge\n"],
      ['remove', 6, 0, "duffle"]
    ]);
    if (!assertEqualArrays(result[0], expected)) throw new Error("textLinesMutator result is wrong: expected "+expected+" got "+result[0]);
    if (!assertEqualArrays(result[1], expected)) throw new Error("mutateTextLines result is wrong: expected "+expected+" got "+result[1]);
    if (!assertEqualStrings(result[2], expected.join(''))) throw new Error('applyToText result is wrong: expected '+expected.join('')+" got "+result[2]);
    done()
  })
  it("applies mutations to an array of lines #2",function(done){
    var expected = ["tuple\n", "banana\n", "cream\n", "pie\n", "cabot\n", "bubba\n", "eggplant\n"];
    var result = runMutationTest(["apple\n", "banana\n", "cabbage\n", "duffle\n", "eggplant\n"], [
      ['remove', 1, 0, "a"],
      ['remove', 1, 0, "p"],
      ['insert', "tu"],
      ['skip', 11, 2],
      ['insert', "cream\npie\n", 2],
      ['skip', 2],
      ['insert', "bot"],
      ['insert', "\n", 1],
      ['insert', "bu"],
      ['skip', 3],
      ['remove', 3, 1, "ge\n"],
      ['remove', 6, 0, "duffle"]
    ]);
    if (!assertEqualArrays(result[0], expected)) throw new Error("textLinesMutator result is wrong: expected "+expected+" got "+result[0]);
    if (!assertEqualArrays(result[1], expected)) throw new Error("mutateTextLines result is wrong: expected "+expected+" got "+result[1]);
    if (!assertEqualStrings(result[2], expected.join(''))) throw new Error('applyToText result is wrong: expected '+expected.join('')+" got "+result[2]);
    done()
  })
  it("applies mutations to an array of lines #3",function(done){
    var expected = ["banana\n", "cabbage\n", "duffle\n"];
    var result = runMutationTest(["apple\n", "banana\n", "cabbage\n", "duffle\n", "eggplant\n"], [
    ['remove', 6, 1, "apple\n"],
    ['skip', 15, 2],
    ['skip', 6],
    ['remove', 1, 1, "\n"],
    ['remove', 8, 0, "eggplant"],
    ['skip', 1, 1]
    ]);
    if (!assertEqualArrays(result[0], expected)) throw new Error("textLinesMutator result is wrong: expected "+expected+" got "+result[0]);
    if (!assertEqualArrays(result[1], expected)) throw new Error("mutateTextLines result is wrong: expected "+expected+" got "+result[1]);
    if (!assertEqualStrings(result[2], expected.join(''))) throw new Error('applyToText result is wrong: expected '+expected.join('')+" got "+result[2]);
    done()
  })
  it("applies mutations to an array of lines #4",function(done){
    var expected = ["1\n", "2\n", "3\n", "4\n", "5\n"];
    var result = runMutationTest(["15\n"], [
    ['skip', 1],
    ['insert', "\n2\n3\n4\n", 4],
    ['skip', 2, 1]
    ]);
    if (!assertEqualArrays(result[0], expected)) throw new Error("textLinesMutator result is wrong: expected "+expected+" got "+result[0]);
    if (!assertEqualArrays(result[1], expected)) throw new Error("mutateTextLines result is wrong: expected "+expected+" got "+result[1]);
    if (!assertEqualStrings(result[2], expected.join(''))) throw new Error('applyToText result is wrong: expected '+expected.join('')+" got "+result[2]);
    done()
  })
  it("applies mutations to an array of lines #5",function(done){
    var expected = ["15\n"];
    var result = runMutationTest(["1\n", "2\n", "3\n", "4\n", "5\n"], [
    ['skip', 1],
    ['remove', 7, 4, "\n2\n3\n4\n"],
    ['skip', 2, 1]
    ]);
    if (!assertEqualArrays(result[0], expected)) throw new Error("textLinesMutator result is wrong: expected "+expected+" got "+result[0]);
    if (!assertEqualArrays(result[1], expected)) throw new Error("mutateTextLines result is wrong: expected "+expected+" got "+result[1]);
    if (!assertEqualStrings(result[2], expected.join(''))) throw new Error('applyToText result is wrong: expected '+expected.join('')+" got "+result[2]);
    done()
  })
  it("applies mutations to an array of lines #6",function(done){
    var expected = ["0123\n", "abc\n", "xyz\n"];
    var result = runMutationTest(["123\n", "abc\n", "def\n", "ghi\n", "xyz\n"], [
    ['insert', "0"],
    ['skip', 4, 1],
    ['skip', 4, 1],
    ['remove', 8, 2, "def\nghi\n"],
    ['skip', 4, 1]
    ]);
    if (!assertEqualArrays(result[0], expected)) throw new Error("textLinesMutator result is wrong: expected "+expected+" got "+result[0]);
    if (!assertEqualArrays(result[1], expected)) throw new Error("mutateTextLines result is wrong: expected "+expected+" got "+result[1]);
    if (!assertEqualStrings(result[2], expected.join(''))) throw new Error('applyToText result is wrong: expected '+expected.join('')+" got "+result[2]);
    done()
  })
  it("applies mutations to an array of lines #7",function(done){
    var expected = ["banana\n", "cabbage\n", "duffle\n"];
    var result = runMutationTest(["apple\n", "banana\n", "cabbage\n", "duffle\n", "eggplant\n"], [
    ['remove', 6, 1, "apple\n"],
    ['skip', 15, 2, true],
    ['skip', 6, 0, true],
    ['remove', 1, 1, "\n"],
    ['remove', 8, 0, "eggplant"],
    ['skip', 1, 1, true]
    ]);
    if (!assertEqualArrays(result[0], expected)) throw new Error("textLinesMutator result is wrong: expected "+expected+" got "+result[0]);
    if (!assertEqualArrays(result[1], expected)) throw new Error("mutateTextLines result is wrong: expected "+expected+" got "+result[1]);
    if (!assertEqualStrings(result[2], expected.join(''))) throw new Error('applyToText result is wrong: expected '+expected.join('')+" got "+result[2]);
    done()
  })
// #2836 regressions
  xit("applies mutations to an array of lines #8",function(done){
    var expected = ["foo\n","c"];
    var result = runMutationTest(["\n","foo\n","\n"], [
    ['remove', 1, 1, "\n"],
    ['skip', 4, 1, false],
    ['remove', 1, 1, "\n"],
    ['insert',"c"]
    ]);
    if (!assertEqualArrays(result[0], expected)) throw new Error("textLinesMutator result is wrong: expected "+expected+" got "+result[0]);
    if (!assertEqualArrays(result[1], expected)) throw new Error("mutateTextLines result is wrong: expected "+expected+" got "+result[1]);
    if (!assertEqualStrings(result[2], expected.join(''))) throw new Error('applyToText result is wrong: expected '+expected.join('')+" got "+result[2]);
    done()
  })
  xit("applies mutations to an array of lines #9",function(done){
    var expected = ["fooc"];
    var result = runMutationTest(["\n","foo\n","\n"], [
    ['remove', 1, 1, "\n"],
    ['skip', 3, 0, false],
    ['remove', 2, 2, "\n\n"],
    ['insert',"c"]
    ]);
    if (!assertEqualArrays(result[0], expected)) throw new Error("textLinesMutator result is wrong: expected "+expected+" got "+result[0]);
    if (!assertEqualArrays(result[1], expected)) throw new Error("mutateTextLines result is wrong: expected "+expected+" got "+result[1]);
    if (!assertEqualStrings(result[2], expected.join(''))) throw new Error('applyToText result is wrong: expected '+expected.join('')+" got "+result[2]);
    done()
  })
  xit("applies mutations to an array of lines #10",function(done){
    var expected = ["c"]; //TODO find out if c must have a newline because of unknown constraints
    var result = runMutationTest(["\n"], [
    ['remove', 1, 1, "\n"],
    ['insert',"c", 0]
    ]);
    if (!assertEqualArrays(result[0], expected)) throw new Error("textLinesMutator result is wrong: expected "+expected+" got "+result[0]);
    if (!assertEqualArrays(result[1], expected)) throw new Error("mutateTextLines result is wrong: expected "+expected+" got "+result[1]);
    if (!assertEqualStrings(result[2], expected.join(''))) throw new Error('applyToText result is wrong: expected '+expected.join('')+" got "+result[2]);
    done()
  })
  xit("applies mutations to an array of lines #11",function(done){
    var expected = ["ac\n"];
    var result = runMutationTest(["\n"], [
    ['remove', 1, 1, "\n"],
    ['insert', "a"],
    ['insert',"c\n", 1]
    ]);
    if (!assertEqualArrays(result[0], expected)) throw new Error("textLinesMutator result is wrong: expected "+expected+" got "+result[0]);
    if (!assertEqualArrays(result[1], expected)) throw new Error("mutateTextLines result is wrong: expected "+expected+" got "+result[1]);
    if (!assertEqualStrings(result[2], expected.join(''))) throw new Error('applyToText result is wrong: expected '+expected.join('')+" got "+result[2]);
    done()
  })
  xit("applies mutations to an array of lines #12",function(done){
    var expected = ["a\n","c"]; //TODO find out if c must have a newline because of unknown constraints
    var result = runMutationTest(["\n"], [
    ['remove', 1, 1, "\n"],
    ['insert', "a\n", 1], 
    ['insert',"c"]
    ]);
    if (!assertEqualArrays(result[0], expected)) throw new Error("textLinesMutator result is wrong: expected "+expected+" got "+result[0]);
    if (!assertEqualArrays(result[1], expected)) throw new Error("mutateTextLines result is wrong: expected "+expected+" got "+result[1]);
    if (!assertEqualStrings(result[2], expected.join(''))) throw new Error('applyToText result is wrong: expected '+expected.join('')+" got "+result[2]);
    done()
  })
})

describe("textLinesMutator",function(){
  it("hasMore indicates remaining characters",function(done){
    var lines = ["1\n", "2\n", "3\n", "4\n"];
    var mu;

    mu = Changeset.textLinesMutator(lines);
    assert(mu.hasMore() + ' == true');
    mu.skip(8, 4);
    assert(mu.hasMore() + ' == false');
    mu.close();
    assert(mu.hasMore() + ' == false');

    // still 1,2,3,4
    mu = Changeset.textLinesMutator(lines);
    assert(mu.hasMore() + ' == true');
    mu.remove(2, 1);
    assert(mu.hasMore() + ' == true');
    mu.skip(2, 1);
    assert(mu.hasMore() + ' == true');
    mu.skip(2, 1);
    assert(mu.hasMore() + ' == true');
    mu.skip(2, 1);
    assert(mu.hasMore() + ' == false');
    mu.insert("5\n", 1);
    assert(mu.hasMore() + ' == false');
    mu.close();
    assert(mu.hasMore() + ' == false');

    // 2,3,4,5 now
    mu = Changeset.textLinesMutator(lines);
    assert(mu.hasMore() + ' == true');
    mu.remove(6, 3);
    assert(mu.hasMore() + ' == true');
    mu.remove(2, 1);
    assert(mu.hasMore() + ' == false');
    mu.insert("hello\n", 1);
    assert(mu.hasMore() + ' == false');
    mu.close();
    assert(mu.hasMore() + ' == false');
    done();
  });
});

function runMutationTest(origLines, muts) {
  var lines1 = origLines.slice();
  var mu = Changeset.textLinesMutator(lines1);
  applyMutations(mu, muts);
  mu.close();

  var inText = origLines.join('');
  var cs = mutationsToChangeset(inText.length, muts);
  lines2 = origLines.slice();
  Changeset.mutateTextLines(cs, lines2);

  var outText = Changeset.applyToText(cs, inText);
  return [lines1,lines2,outText];
}

function applyMutations(mu, arrayOfArrays) {
  arrayOfArrays.forEach(function (a) {
    var result = mu[a[0]].apply(mu, a.slice(1));
    if (a[0] == 'remove' && a[3]) {
      assertEqualStrings(a[3], result);
    }
  });
}

function mutationsToChangeset(oldLen, arrayOfArrays) {
  var assem = Changeset.smartOpAssembler();
  var op = Changeset.newOp();
  var bank = Changeset.stringAssembler();
  var oldPos = 0;
  var newLen = 0;
  arrayOfArrays.forEach(function (a) {
    if (a[0] == 'skip') {
      op.opcode = '=';
      op.chars = a[1];
      op.lines = (a[2] || 0);
      assem.append(op);
      oldPos += op.chars;
      newLen += op.chars;
    } else if (a[0] == 'remove') {
      op.opcode = '-';
      op.chars = a[1];
      op.lines = (a[2] || 0);
      assem.append(op);
      oldPos += op.chars;
    } else if (a[0] == 'insert') {
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
}
