var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var AttributePool = require("ep_etherpad-lite/static/js/AttributePool");
var helper = require("./helper.js")
var assertEqualStrings = helper.assertEqualStrings;
var assertEqualArrays = helper.assertEqualArrays;
var assert = helper.assert;
var poolOrArray = helper.poolOrArray;


describe("other",function(){
  it("testMakeSplice",function(done){
    var t = "a\nb\nc\n";
    var t2 = Changeset.applyToText(Changeset.makeSplice(t, 5, 0, "def"), t);
    assertEqualStrings("a\nb\ncdef\n", t2);
  
    done();
  })
  it("testToSplices",function(done){
    var cs = Changeset.checkRep('Z:z>9*0=1=4-3+9=1|1-4-4+1*0+a$123456789abcdefghijk');
    var correctSplices = [
      [5, 8, "123456789"],
      [9, 17, "abcdefghijk"]
    ];
    assertEqualArrays(correctSplices, Changeset.toSplices(cs));
  
    done();
  })
  it("testOpAttributeValue",function(done){
  
    var p = new AttributePool();
    p.putAttrib(['name', 'david']);
    p.putAttrib(['color', 'green']);

    assertEqualStrings("david", Changeset.opAttributeValue(Changeset.stringOp('*0*1+1'), 'name', p));
    assertEqualStrings("david", Changeset.opAttributeValue(Changeset.stringOp('*0+1'), 'name', p));
    assertEqualStrings("", Changeset.opAttributeValue(Changeset.stringOp('*1+1'), 'name', p));
    assertEqualStrings("", Changeset.opAttributeValue(Changeset.stringOp('+1'), 'name', p));
    assertEqualStrings("green", Changeset.opAttributeValue(Changeset.stringOp('*0*1+1'), 'color', p));
    assertEqualStrings("green", Changeset.opAttributeValue(Changeset.stringOp('*1+1'), 'color', p));
    assertEqualStrings("", Changeset.opAttributeValue(Changeset.stringOp('*0+1'), 'color', p));
    assertEqualStrings("", Changeset.opAttributeValue(Changeset.stringOp('+1'), 'color', p));
    done();
  })

  it("turn c<b>a</b>ctus\n into a<b>c</b>tusabcd\n",function(done){
    runApplyToAttributionTest(1, ['bold,', 'bold,true'], "Z:7>3-1*0=1*1=1=3+4$abcd", "+1*1+1|1+5", "+1*1+1|1+8");
    done();
  })
  it("turn david\ngreenspan\n into <b>david\ngreen</b>\n",function(done){
    runApplyToAttributionTest(2, ['bold,', 'bold,true'], "Z:g<4*1|1=6*1=5-4$", "|2+g", "*1|1+6*1+5|1+1");
    done();
  })

  it("test filter1",function(done){
  testFilterAttribNumbers(1, "*0*1+1+2+3*1+4*2+5*0*2*1*b*c+6", function (n) {
    return (n % 2) == 0;
  }, "*0+1+2+3+4*2+5*0*2*c+6");
  
    done();
  })
  it("test filter2",function(done){
  
  testFilterAttribNumbers(2, "*0*1+1+2+3*1+4*2+5*0*2*1*b*c+6", function (n) {
    return (n % 2) == 1;
  }, "*1+1+2+3*1+4+5*1*b+6");
    done();
  })
  it("take FFFFTTTTT and apply -FT--FFTT, the inverse of which is --F--TT--",function(done){
    testInverse(1, "Z:9>0=1*0=1*1=1=2*0=2*1|1=2$", null, ["+4*1+5"], ['bold,', 'bold,true'], "Z:9>0=2*0=1=2*1=2$");
    done();
  })
  it("testMutateTextLines 1",function(done){
  
  testMutateTextLines(1, "Z:4<1|1-2-1|1+1+1$\nc", ["a\n", "b\n"], ["\n", "c\n"]);
    done();
  })
  it("testMutateTextLines 2",function(done){
  
  testMutateTextLines(2, "Z:4>0|1-2-1|2+3$\nc\n", ["a\n", "b\n"], ["\n", "c\n", "\n"]);
    done();
  })
  xit("throughIterator",function(done){
  
    var x = '-c*3*4+6|3=az*asdf0*1*2*3+1=1-1+1*0+1=1-1+1|c=c-1';
    assert("throughIterator(" + literal(x) + ") == " + literal(x));
    done();
  })
  xit("throughSmartAssembler",function(done){
  
    var x = '-c*3*4+6|3=az*asdf0*1*2*3+1=1-1+1*0+1=1-1+1|c=c-1';
    assert("throughSmartAssembler(" + literal(x) + ") == " + literal(x));
    done();
  })
})


  // throughIterator is not used
  function throughIterator(opsStr) {
    var iter = Changeset.opIterator(opsStr);
    var assem = Changeset.opAssembler();
    while (iter.hasNext()) {
      assem.append(iter.next());
    }
    return assem.toString();
  }

  // throughSmartAssembler is not used
  function throughSmartAssembler(opsStr) {
    var iter = Changeset.opIterator(opsStr);
    var assem = Changeset.smartOpAssembler();
    while (iter.hasNext()) {
      assem.append(iter.next());
    }
    assem.endDocument();
    return assem.toString();
  }





  function testMutateTextLines(testId, cs, lines, correctLines) {

    var a = lines.slice();
    Changeset.mutateTextLines(cs, a);
    assertEqualArrays(correctLines, a);
  }

  function testInverse(testId, cs, lines, alines, pool, correctOutput) {

    pool = poolOrArray(pool);
    var str = Changeset.inverse(Changeset.checkRep(cs), lines, alines, pool);
    assertEqualStrings(correctOutput, str);
  }

  function testFilterAttribNumbers(testId, cs, filter, correctOutput) {

    var str = Changeset.filterAttribNumbers(cs, filter);
    assertEqualStrings(correctOutput, str);
  }

  function runApplyToAttributionTest(testId, attribs, cs, inAttr, outCorrect) {
    var p = poolOrArray(attribs);
    var result = Changeset.applyToAttribution(
    Changeset.checkRep(cs), inAttr, p);
    assertEqualStrings(outCorrect, result);
  }


