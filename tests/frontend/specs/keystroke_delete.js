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
    
    // get the original length of this element
    var elementLength = firstTextElement.text().length;

    // get the original string value minus the last char
    var originalTextValue = firstTextElement.text();
    originalTextValueMinusFirstChar = originalTextValue.substring(1, originalTextValue.length );

    // simulate key presses to delete content
    firstTextElement.sendkeys('{leftarrow}'); // simulate a keypress of the left arrow key
    firstTextElement.sendkeys('{del}'); // simulate a keypress of delete

    //ace creates a new dom element when you press a keystroke, so just get the first text element again
    var newFirstTextElement = $inner.find("div").first();
    
    // get the new length of this element
    var newElementLength = newFirstTextElement.text().length;

    //expect it to be one char less in length
    expect(newElementLength).to.be((elementLength-1));

    //make sure the text has changed correctly
    expect(newFirstTextElement.text()).to.eql(originalTextValueMinusFirstChar);

  });
});
