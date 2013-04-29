describe("timeslider", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(6000);
  });
  it("writes in 10 thousand lines", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 
    var chars = 'abcdefghijkl monp qrstr uvw xyz';
    var lines = 999;
    var length = lines * (chars.length+1); // add a counter for each enter
    var text = "";
    this.timeout(lines * 100);

    length = length -1; // remove a count for the last line

    var textElement = inner$("div");
    textElement.sendkeys('{selectall}'); // select all
    textElement.sendkeys('{del}'); // clear the first line

    for(var i=0; i < lines; i++) {
      text = text + chars + "\n";
    }

    // console.log("sending keys to pad <-- I AM REALLY SLOW!");
    inner$("div").first().sendkeys(text);
    // console.log("pad recieved keys");

    helper.waitFor(function(){ // Wait for the lines to be on the pad
      return inner$("div").text().length === length;
    }).done(function(){
      //make sure the text has changed
      expect( inner$("div").text().length ).to.eql( length ); // yep :)

      inner$("div").first().sendkeys(chars);
      inner$("div").first().sendkeys('{enter}'); // send some new chars
      var start = new Date().getTime();

      helper.waitFor(function(){ // Wait for the new line to be on the pad
        length = length + (chars.length+1);
        return inner$("div").text().length === length;
      }).done(function(){
        var end = new Date().getTime();
        var delay = end - start;
        // console.log("delay:", delay);
        expect(delay).to.be.below(50);
        done();
      }, 1000);
    }, 10000);
  });
});
