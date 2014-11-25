describe("undo button", function(){
  beforeEach(function(cb){
    helper.newPad(cb); // creates a new pad
    this.timeout(60000);
  });

/*
  it("undo some typing by clicking undo button", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;
    
    // get the first text element inside the editable space
    var $firstTextElement = inner$("div span").first();
    var originalValue = $firstTextElement.text(); // get the original value

    $firstTextElement.sendkeys("foo"); // send line 1 to the pad
    var modifiedValue = $firstTextElement.text(); // get the modified value
    expect(modifiedValue).not.to.be(originalValue); // expect the value to change

    // get clear authorship button as a variable
    var $undoButton = chrome$(".buttonicon-undo");
    // click the button
    $undoButton.click();

    helper.waitFor(function(){
      return inner$("div span").first().text() === originalValue;
    }).done(function(){
      var finalValue = inner$("div span").first().text();
      expect(finalValue).to.be(originalValue); // expect the value to change
      done();
    });
  });
*/

  it("undo some typing using a keypress", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    // get the first text element inside the editable space
    var $firstTextElement = inner$("div span").first();
    var originalValue = $firstTextElement.text(); // get the original value

    $firstTextElement.sendkeys("foo"); // send line 1 to the pad
    var modifiedValue = $firstTextElement.text(); // get the modified value
    expect(modifiedValue).not.to.be(originalValue); // expect the value to change

    if(inner$.browser.mozilla){ // if it's a mozilla browser
      var evtType = "keypress";
    }else{
      var evtType = "keydown";
    }

    var e = inner$.Event(evtType);
    e.ctrlKey = true; // Control key
    e.which = 90; // z
    inner$("#innerdocbody").trigger(e);

    helper.waitFor(function(){
      return inner$("div span").first().text() === originalValue;
    }).done(function(){
      var finalValue = inner$("div span").first().text();
      expect(finalValue).to.be(originalValue); // expect the value to change
      done();
    });
  });


});

