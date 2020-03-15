describe("enter keystroke", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("creates a new line & puts cursor onto a new line", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 
    
    //get the first text element out of the inner iframe
    var $firstTextElement = inner$("div").first();
    
    // get the original string value minus the last char
    var originalTextValue = $firstTextElement.text();

    // simulate key presses to enter content
    $firstTextElement.sendkeys('{enter}');

    //ace creates a new dom element when you press a keystroke, so just get the first text element again
    var $newFirstTextElement = inner$("div").first();
    
    helper.waitFor(function(){
      return inner$("div").first().text() === "";
    }).done(function(){
      var $newSecondLine = inner$("div").first().next();
      var newFirstTextElementValue = inner$("div").first().text();
      expect(newFirstTextElementValue).to.be(""); // expect the first line to be blank
      expect($newSecondLine.text()).to.be(originalTextValue); // expect the second line to be the same as the original first line.
      done();
    });
  });
});
