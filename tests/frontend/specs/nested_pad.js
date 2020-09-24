describe("Nested Pad", function(){
    var expectedPadId = "pad1:pad2" + Math.round(Math.random()*1000);
  
    //create a new pad before each test run
    beforeEach(function(cb){
      helper.newPad(cb, expectedPadId);
      this.timeout(60000);
    });
  
    it("pad ids must be the same", function(done) {
      var chrome$ = helper.padChrome$;
      var clientVarsPadId = chrome$.window.clientVars.padId
      var backPadId = chrome$.window.window.pad.getPadId()

      console.log(clientVarsPadId, "=======", backPadId, "=======" , expectedPadId)

      helper.waitFor(function(){
          return (clientVarsPadId === backPadId) && (backPadId.endsWith(expectedPadId))
      }, 2000).done(done);

    });

    // timeslider_labels.js
    it("make some changes and then navigate to the timeslider to check the history", function(done) {
      var inner$ = helper.padInner$;
      // make some changes to produce 100 revisions
      var revs = 10;
      this.timeout(60000);
      for(var i=0; i < revs; i++) {
        setTimeout(function() {
          // enter 'a' in the first text element
          inner$("div").first().sendkeys('a');
        }, 200);
      }
  
      setTimeout(function() {
        // go to timeslider
        $('#iframe-container iframe').attr('src', $('#iframe-container iframe').attr('src')+'/timeslider');
  
        setTimeout(function() {
          var timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
          var $sliderBar = timeslider$('#ui-slider-bar');

  
          // Click somewhere on the timeslider
          var e = new jQuery.Event('mousedown');
          e.clientX = e.pageX = 150;
          e.clientY = e.pageY = 45;
          $sliderBar.trigger(e);
  
          e = new jQuery.Event('mousedown');
          e.clientX = e.pageX = 150;
          e.clientY = e.pageY = 40;
          $sliderBar.trigger(e);
  
          e = new jQuery.Event('mousedown');
          e.clientX = e.pageX = 150;
          e.clientY = e.pageY = 50;
          $sliderBar.trigger(e);
  
          $sliderBar.trigger('mouseup')
  
          setTimeout(function() {
            //make sure the text has changed
            expect( timeslider$('#timer').text() ).not.to.eql( "" );
            expect( timeslider$('#revision_date').text() ).not.to.eql( "" );
            expect( timeslider$('#revision_label').text() ).not.to.eql( "" );
            var includesNaN = timeslider$('#revision_label').text().indexOf("NaN"); // NaN is bad. Naan ist gut
            expect( includesNaN ).to.eql( -1 ); // not quite so tasty, I like curry.
            done();
          }, 400);
        }, 2000);
      }, 2000);
    });

  });
  