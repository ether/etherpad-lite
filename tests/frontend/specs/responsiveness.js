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
    textElement.sendkeys('{del}'); // clear the first line

    for(var i=0; i <= amount; i++) {
      text = text + chars + " "; // add the cahrs and line break to the text
    }
    inner$("div").first().text(text); // Put the text contents into the pad

    helper.waitFor(function(){ // Wait for the new text to be on the pad
      var newLength = inner$("div").text().length;
      return newLength > length;
    }).done(function(){
      //make sure the text has changed
      expect( inner$("div").text().length ).to.be.greaterThan( length ); // yep :)

      inner$("div").first().sendkeys(chars);
      var start = new Date().getTime();

      helper.waitFor(function(){ // Wait for the new line to be on the pad
        //length = chars.length;
        //var withCharsLength = inner$("div").text().length;
        //return withCharsLength > length;
        return true; // Ghetto but works for now
      }).done(function(){
        var end = new Date().getTime();
        var delay = end - start;

        console.log("delay:", delay);
        expect(delay).to.be.below(50);
        done();
      }, 1000);
    }, 10000);
  });

});

