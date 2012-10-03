describe("bold button", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    testHelper.newPad(cb);
  });

  it("makes text bold", function() {
    //get the inner iframe
    var $inner = testHelper.$getPadInner();
    
    //get the first text element out of the inner iframe
    var firstTextElement = $inner.find("div").first();
    
    //select this text element
    testHelper.selectText(firstTextElement[0], $inner);

    //get the bold button and click it
    var $boldButton = testHelper.$getPadChrome().find(".buttonicon-bold");
    $boldButton.click();

    //ace creates a new dom element when you press a button, so just get the first text element again
    var newFirstTextElement = $inner.find("div").first();
    
    // is there a <b> element now?
    var isBold = newFirstTextElement.find("b").length === 1;

    //expect it to be bold
    expect(isBold).to.be(true);

    //make sure the text hasn't changed
    expect(newFirstTextElement.text()).to.eql(firstTextElement.text());
  });
});