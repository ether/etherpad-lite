describe("bold button", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    this.timeout(5000);
    helper.newPad(cb);
  });

  it("makes text bold", function() {
    var inner$ = helper.jQueryOf("inner"); 
    var chrome$ = helper.jQueryOf("chrome"); 

    //get the first text element out of the inner iframe
    var $firstTextElement = inner$("div").first();
    
    //select this text element
    $firstTextElement.sendkeys('{selectall}');

    //get the bold button and click it
    var $boldButton = chrome$(".buttonicon-bold");
    $boldButton.click();
    
    //ace creates a new dom element when you press a button, so just get the first text element again
    var $newFirstTextElement = inner$("div").first();
    
    // is there a <b> element now?
    var isBold = $newFirstTextElement.find("b").length === 1;

    //expect it to be bold
    expect(isBold).to.be(true);

    //make sure the text hasn't changed
    expect($newFirstTextElement.text()).to.eql($firstTextElement.text());
  });
});