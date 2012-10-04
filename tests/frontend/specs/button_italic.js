describe("italic button", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    testHelper.newPad(cb);
  });

  it("makes text italic", function() {
    //get the inner iframe
    var $inner = testHelper.$getPadInner();
    
    //get the first text element out of the inner iframe
    var firstTextElement = $inner.find("div").first();
    
    //select this text element
    testHelper.selectText(firstTextElement[0], $inner);

    //get the bold button and click it
    var $italicButton = testHelper.$getPadChrome().find(".buttonicon-italic");
    $italicButton.click();

    //ace creates a new dom element when you press a button, so just get the first text element again
    var newFirstTextElement = $inner.find("div").first();
    
    // is there a <b> element now?
    var isItalic = newFirstTextElement.find("i").length === 1;

    //expect it to be bold
    expect(isItalic).to.be(true);

    //make sure the text hasn't changed
    expect(newFirstTextElement.text()).to.eql(firstTextElement.text());
  });
});
