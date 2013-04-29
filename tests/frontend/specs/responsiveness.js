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
    var amount = 200000; //number of blocks of chars we will insert
    var length = (amount * (chars.length) +1); // include a counter for each space
    var text = ""; // the text we're gonna insert
    this.timeout(amount * 100);

    var textElement = inner$("div");
    textElement.sendkeys('{selectall}'); // select all
    textElement.sendkeys('{del}'); // clear the pad text

    for(var i=0; i <= amount; i++) {
      text = text + chars + " "; // add the chars and space to the text contents
    }
    inner$("div").first().text(text); // Put the text contents into the pad

    helper.waitFor(function(){ // Wait for the new contents to be on the pad
      return inner$("div").text().length > length;
    }).done(function(){

      expect( inner$("div").text().length ).to.be.greaterThan( length ); // has the text changed?
      var start = new Date().getTime(); // get the start time
      inner$("div").first().sendkeys(chars); // send some new text to teh screen

      helper.waitFor(function(){ // Wait for the ability to process
        return true; // Ghetto but works for now
      }).done(function(){
        var end = new Date().getTime(); // get the current time
        var delay = end - start; // get the delay as the current time minus the start time

        console.log("delay:", delay);
        expect(delay).to.be.below(50);
        done();
      }, 1000);

    }, 10000);
  });

});

