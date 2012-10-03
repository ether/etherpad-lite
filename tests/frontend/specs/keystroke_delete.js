describe("delete keystroke", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    testHelper.newPad(cb);
  });

  it("makes text delete", function() {
    //get the inner iframe
    var $inner = testHelper.$getPadInner();
    
    //get the first text element out of the inner iframe
    var firstTextElement = $inner.find("div").first();
    
    //select this text element
    testHelper.selectText(firstTextElement[0]);

    // get the original length of this element
    var elementLength = firstTextElement.html().length;
    console.log(elementLength);

    //get the bold keystroke and click it
    // var $deletekeystroke = testHelper.$getPadChrome().find(".keystrokeicon-delete");

    //put the cursor in the pad
    var press = $.Event("keypress");
    press.ctrlKey = false;
    press.which = 46; // 46 is delete key
    firstTextElement.trigger(press); // simulate a keypress of delete
    press.which = 37; // 37 is left key taking user to first place in pad.
    firstTextElement.trigger(press); // simulate a keypress of left key

    //ace creates a new dom element when you press a keystroke, so just get the first text element again
    var newFirstTextElement = $inner.find("div").first();
    
    // is there a <b> element now?
    // var isdelete = newFirstTextElement.find("i").length === 1;

    // get the new length of this element
    var newElementLength = newFirstTextElement.html().length;
    console.log(newElementLength);

    //expect it to be one char less
    expect(newElementLength).to.be((elementLength-1));

    //make sure the text hasn't changed
    expect(newFirstTextElement.text()).to.eql(firstTextElement.text());
  });
});
