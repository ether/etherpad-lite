describe("undo button", function(){
  beforeEach(function(cb){
    helper.newPad(cb); // creates a new pad
    this.timeout(60000);
  });

  it("undo some typing", function(done){
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
});

