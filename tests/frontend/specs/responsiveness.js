// Test for https://github.com/ether/etherpad-lite/issues/1763

// This test fails in Chrome, Opera, IE and Safari
// Opera fails due to a weird way of handling the order of execution, yet actual performance seems fine
// Safari fails due the delay being too great yet the actual performance seems fine
// Firefox might panic that the script is taking too long so will fail
// IE will fail due to running out of memory as it can't fit 2M chars in memory.

// Just FYI Google Docs crashes on large docs whilst trying to Save, it's likely the limitations we are
// experiencing are more to do with browser limitations than improper implementation.
// A ueber fix for this would be to have a seperate lower cpu priority thread that handles operations that aren't
// visible to the user.

describe("Responsiveness of Editor", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(6000);
  });

  it("Fast response to keypress in pad with large amount of contents", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 
    var chars = '0000000000'; // row of placeholder chars
    var amount = 10000; //number of lines of chars we will insert
    var length = (amount * (chars.length) + chars.length); // include a counter for each space
    var text = ""; // the text we're gonna insert
    this.timeout(amount * 100);

    var textElement = inner$("div");
    inner$("div").html(""); // clear the Pad, will leave white space from line breaks :(
    var originalLines = inner$("div").length; // how many lines are left over..

    for(var i=0; i <= amount; i++) {
      text = text + chars + "<br>"; // add the chars and line break to the text contents
    }
    inner$("div").first().html(text); // Put the text contents into the pad

    /**
    *
    *  Now the pad has had it's pad contents sent to it, we wait for it to be updated..
    *
    **/
    helper.waitFor(function(){ // Wait for the new contents to be on the pad and line numbers to be updated.
      var lineNumbersUpdated =  chrome$('iframe[name="ace_outer"]').contents().find('#sidedivinner').contents().length === amount + originalLines; // line numbers drawn..
      var contentsExists = inner$("div").text().length === length; // contents drawn
      return (contentsExists && lineNumbersUpdated);
    }).done(function(){

      expect( inner$("div").text().length ).to.eql( length ); // has the text changed?

      var start = new Date().getTime(); // get the start time

      inner$("div").first().sendkeys("a"); // send some new text to teh screen
      inner$("div").first().sendkeys("b"); // send some new text to teh screen
      inner$("div").first().sendkeys("c"); // send some new text to teh screen
      inner$("div").first().sendkeys("d"); // send some new text to teh screen
      inner$("div").first().sendkeys("e"); // send some new text to teh screen
      inner$("div").first().sendkeys("f"); // send some new text to teh screen
      inner$("div").first().sendkeys("\n"); // send some new text to teh screen

      var expectedLines = amount +1 + originalLines; // how many lines we expect after the new contents

      helper.waitFor(function(){ // Wait for the ability to process
        var newLineExists = chrome$('iframe[name="ace_outer"]').contents().find('#sidedivinner').contents().length === expectedLines;
        var charsExists = inner$("div").first().text() === "abcdef"; // wait for the text to be fully visible on the screen
        return (newLineExists && charsExists);
      }).done(function(){
        var end = new Date().getTime(); // get the current time
        var delay = end - start; // get the delay as the current time minus the start time
        expect(delay).to.be.below(900);
        done();
      }, 5000);
    }, 10000);
  });

});

