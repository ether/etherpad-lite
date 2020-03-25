//deactivated, we need a nice way to get the timeslider, this is ugly
xdescribe("timeslider button takes you to the timeslider of a pad", function(){
  beforeEach(function(cb){
    helper.newPad(cb); // creates a new pad
    this.timeout(60000);
  });

  it("timeslider contained in URL", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    // get the first text element inside the editable space
    var $firstTextElement = inner$("div span").first();
    var originalValue = $firstTextElement.text(); // get the original value
    var newValue = "Testing"+originalValue;
    $firstTextElement.sendkeys("Testing"); // send line 1 to the pad

    var modifiedValue = $firstTextElement.text(); // get the modified value
    expect(modifiedValue).not.to.be(originalValue); // expect the value to change

    helper.waitFor(function(){
      return modifiedValue !== originalValue; // The value has changed so  we can..
    }).done(function(){

      var $timesliderButton = chrome$("#timesliderlink");
      $timesliderButton.click(); // So click the timeslider link

      helper.waitFor(function(){
        var iFrameURL = chrome$.window.location.href;
        if(iFrameURL){
          return iFrameURL.indexOf("timeslider") !== -1;
        }else{
          return false; // the URL hasnt been set yet
        }
      }).done(function(){
        // click the buttons
        var iFrameURL = chrome$.window.location.href; // get the url
        var inTimeslider = iFrameURL.indexOf("timeslider") !== -1;
        expect(inTimeslider).to.be(true); // expect the value to change
        done();
      });


    });
  });
});

