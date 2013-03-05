describe("timeslider", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("Shows a date and time in the timeslider and make sure it doesn't include NaN", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 
    
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
        
        var latestContents = timeslider$('#padcontent').text();

        // Expect the date and time to be shown

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
