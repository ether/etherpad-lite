describe("Nested Pad", function(){
    var expectedPadId = "pad1:pad2" + Math.round(Math.random()*1000);
  
    //create a new pad before each test run
    beforeEach(function(cb){
      helper.newPad(cb, expectedPadId);
      this.timeout(60000);
    });
  
    it("pad ids must be the same", function(done) {
      var chrome$ = helper.padChrome$;
      var clientVarsPadId = chrome$.window.clientVars.padId;
      var backPadId = chrome$.window.window.pad.getPadId();

      helper.waitFor(function(){
          return (clientVarsPadId === backPadId) && (backPadId.endsWith(expectedPadId));
      }, 2000).done(done);

    });

  });
  