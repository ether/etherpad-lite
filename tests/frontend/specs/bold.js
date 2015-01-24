describe("bold button", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("makes text bold on click", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 

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

    done();
  });

  it("makes text bold on keypress", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //get the first text element out of the inner iframe
    var $firstTextElement = inner$("div").first();

    //select this text element
    $firstTextElement.sendkeys('{selectall}');

    if(inner$(window)[0].bowser.firefox || inner$(window)[0].bowser.modernIE){ // if it's a mozilla or IE 
      var evtType = "keypress";
    }else{
      var evtType = "keydown";
    }

    var e = inner$.Event(evtType);
    e.ctrlKey = true; // Control key
    e.which = 66; // b
    inner$("#innerdocbody").trigger(e);

    //ace creates a new dom element when you press a button, so just get the first text element again
    var $newFirstTextElement = inner$("div").first();

    // is there a <b> element now?
    var isBold = $newFirstTextElement.find("b").length === 1;

    //expect it to be bold
    expect(isBold).to.be(true);

    //make sure the text hasn't changed
    expect($newFirstTextElement.text()).to.eql($firstTextElement.text());

    done();
  });
});
