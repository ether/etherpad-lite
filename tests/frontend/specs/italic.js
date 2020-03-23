describe("italic some text", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("makes text italic using button", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //get the first text element out of the inner iframe
    var $firstTextElement = inner$("div").first();

    //select this text element
    $firstTextElement.sendkeys('{selectall}');

    //get the bold button and click it
    var $boldButton = chrome$(".buttonicon-italic");
    $boldButton.click();

    //ace creates a new dom element when you press a button, so just get the first text element again
    var $newFirstTextElement = inner$("div").first();

    // is there a <i> element now?
    var isItalic = $newFirstTextElement.find("i").length === 1;

    //expect it to be bold
    expect(isItalic).to.be(true);

    //make sure the text hasn't changed
    expect($newFirstTextElement.text()).to.eql($firstTextElement.text());

    done();
  });

  it("makes text italic using keypress", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //get the first text element out of the inner iframe
    var $firstTextElement = inner$("div").first();

    //select this text element
    $firstTextElement.sendkeys('{selectall}');

    var e = inner$.Event(helper.evtType);
    e.ctrlKey = true; // Control key
    e.which = 105; // i
    inner$("#innerdocbody").trigger(e);

    //ace creates a new dom element when you press a button, so just get the first text element again
    var $newFirstTextElement = inner$("div").first();

    // is there a <i> element now?
    var isItalic = $newFirstTextElement.find("i").length === 1;

    //expect it to be bold
    expect(isItalic).to.be(true);

    //make sure the text hasn't changed
    expect($newFirstTextElement.text()).to.eql($firstTextElement.text());

    done();
  });

});
