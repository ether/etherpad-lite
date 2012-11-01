describe("undo button then redo button", function(){
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
    var newString = "Foo";

    $firstTextElement.sendkeys(newString); // send line 1 to the pad
    var modifiedValue = $firstTextElement.text(); // get the modified value
    expect(modifiedValue).not.to.be(originalValue); // expect the value to change

    // get undo and redo buttons
    var $undoButton = chrome$(".buttonicon-undo");
    var $redoButton = chrome$(".buttonicon-redo");
    // click the buttons
    $undoButton.click(); // removes foo
    $redoButton.click(); // resends foo

    helper.waitFor(function(){
      console.log(inner$("div span").first().text());
      return inner$("div span").first().text() === newString;
    }).done(function(){
      var finalValue = inner$("div").first().text();
      expect(finalValue).to.be(modifiedValue); // expect the value to change
      done();
    });
  });
});

