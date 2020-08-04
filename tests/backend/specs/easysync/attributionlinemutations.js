var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var AttributePool = require("ep_etherpad-lite/static/js/AttributePool");
var helper = require("./helper.js")
var assertEqualStrings = helper.assertEqualStrings;
var assertEqualArrays = helper.assertEqualArrays;

describe("attribution line mutations",function(){
  it("turns 123\\n 456\\n 789\\n into 123\\n 4<b>5</b>6\\n 789\\n",function(done){
    runMutateAttributionTest(1, ["bold,true"], "Z:c>0|1=4=1*0=1$", ["|1+4", "|1+4", "|1+4"], ["|1+4", "+1*0+1|1+2", "|1+4"]);
    done();
  })

  it("makes a document bold",function(done){
    runMutateAttributionTest(2, ["bold,true"], "Z:c>0*0|3=c$", ["|1+4", "|1+4", "|1+4"], ["*0|1+4", "*0|1+4", "*0|1+4"]);
    done();
  })
  
  it("clears bold on document",function(done){
    runMutateAttributionTest(3, ["bold,", "bold,true"], "Z:c>0*0|3=c$", ["*1+1+1*1+1|1+1", "+1*1+1|1+2", "*1+1+1*1+1|1+1"], ["|1+4", "|1+4", "|1+4"]);
    done();
  })

  // if any attribution string with a '?' is parsed it will cause an error.
  it("adds a character on line 3 of a document with 5 blank lines, and make sure the optimization that skips purely-kept lines is working",function(done){
    runMutateAttributionTest(4, ['foo,bar', 'line,1', 'line,2', 'line,3', 'line,4', 'line,5'], "Z:5>1|2=2+1$x", ["?*1|1+1", "?*2|1+1", "*3|1+1", "?*4|1+1", "?*5|1+1"], ["?*1|1+1", "?*2|1+1", "+1*3|1+1", "?*4|1+1", "?*5|1+1"]);
    done();
  })

  it("based on runMutationTest#1",function(done){
    runMutateAttributionTest(5, testPoolWithChars, "Z:11>7-2*t+1*u+1|2=b|2+a=2*b+1*o+1*t+1*0|1+1*b+1*u+1=3|1-3-6$" + "tucream\npie\nbot\nbu", ["*a+1*p+2*l+1*e+1*0|1+1", "*b+1*a+1*n+1*a+1*n+1*a+1*0|1+1", "*c+1*a+1*b+2*a+1*g+1*e+1*0|1+1", "*d+1*u+1*f+2*l+1*e+1*0|1+1", "*e+1*g+2*p+1*l+1*a+1*n+1*t+1*0|1+1"], ["*t+1*u+1*p+1*l+1*e+1*0|1+1", "*b+1*a+1*n+1*a+1*n+1*a+1*0|1+1", "|1+6", "|1+4", "*c+1*a+1*b+1*o+1*t+1*0|1+1", "*b+1*u+1*b+2*a+1*0|1+1", "*e+1*g+2*p+1*l+1*a+1*n+1*t+1*0|1+1"]);
    done();
  })

  it("based on runMutationTest#3",function(done){
    runMutateAttributionTest(6, testPoolWithChars, "Z:11<f|1-6|2=f=6|1-1-8$", ["*a|1+6", "*b|1+7", "*c|1+8", "*d|1+7", "*e|1+9"], ["*b|1+7", "*c|1+8", "*d+6*e|1+1"]);
    done();
  })

  it("based on runMutationTest#4",function(done){
    runMutateAttributionTest(7, testPoolWithChars, "Z:3>7=1|4+7$\n2\n3\n4\n", ["*1+1*5|1+2"], ["*1+1|1+1", "|1+2", "|1+2", "|1+2", "*5|1+2"]);
    done();
  })

  it("based on runMutationTest#5",function(done){
    runMutateAttributionTest(8, testPoolWithChars, "Z:a<7=1|4-7$", ["*1|1+2", "*2|1+2", "*3|1+2", "*4|1+2", "*5|1+2"], ["*1+1*5|1+2"]);
    done();
  })

  it("based on runMutationTest#6",function(done){
    runMutateAttributionTest(9, testPoolWithChars, "Z:k<7*0+1*10|2=8|2-8$0", ["*1+1*2+1*3+1|1+1", "*a+1*b+1*c+1|1+1", "*d+1*e+1*f+1|1+1", "*g+1*h+1*i+1|1+1", "?*x+1*y+1*z+1|1+1"], ["*0+1|1+4", "|1+4", "?*x+1*y+1*z+1|1+1"]);
    done();
  })

  it("based on ?",function(done){
    runMutateAttributionTest(10, testPoolWithChars, "Z:6>4=1+1=1+1|1=1+1=1*0+1$abcd", ["|1+3", "|1+3"], ["|1+5", "+2*0+1|1+2"]);
    done();
  })

  it("based on ?",function(done){
    runMutateAttributionTest(11, testPoolWithChars, "Z:s>1|1=4=6|1+1$\n", ["*0|1+4", "*0|1+8", "*0+5|1+1", "*0|1+1", "*0|1+5", "*0|1+1", "*0|1+1", "*0|1+1", "|1+1"], ["*0|1+4", "*0+6|1+1", "*0|1+2", "*0+5|1+1", "*0|1+1", "*0|1+5", "*0|1+1", "*0|1+1", "*0|1+1", "|1+1"]);
    done();
  })
})

function runMutateAttributionTest(testId, attribs, cs, alines, outCorrect) {
  var p = poolOrArray(attribs);
  var alines2 = Array.prototype.slice.call(alines);
  // result is never used
  var result = Changeset.mutateAttributionLines(
  Changeset.checkRep(cs), alines2, p);
  assertEqualArrays(outCorrect, alines2);


  function removeQuestionMarks(a) {
    return a.replace(/\?/g, '');
  }
  // applyToAttribution
  var inMerged = Changeset.joinAttributionLines(alines.map(removeQuestionMarks));
  var correctMerged = Changeset.joinAttributionLines(outCorrect.map(removeQuestionMarks));
  var mergedResult = Changeset.applyToAttribution(cs, inMerged, p);
  assertEqualStrings(correctMerged, mergedResult);
}

var testPoolWithChars = (function () {
  var p = new AttributePool();
  p.putAttrib(['char', 'newline']);
  for (var i = 1; i < 36; i++) {
    p.putAttrib(['char', Changeset.numToString(i)]);
  }
  p.putAttrib(['char', '']);
  return p;
})();


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



