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
        var originalDateTime = timeslider$('#timer').text();
        
        var latestContents = timeslider$('#padcontent').text();

        // Expect the date and time to be shown
        timeslider$('#leftstep').click();

        setTimeout(function() {
          //make sure the text has changed
          expect( timeslider$('#timer').text() ).not.to.eql( "" );
          expect( timeslider$('#timer').text() ).not.to.eql( originalDateTime );
          // expect( timeslider$('#revision_date').text() ).not.to.eql( "" );
          // expect( timeslider$('#revision_label').text() ).not.to.eql( "" );
          var includesNaN = timeslider$('#revision_label').text().indexOf("NaN"); // NaN is bad. Naan ist gut
          expect( includesNaN ).to.eql( -1 ); // not quite so tasty, I like curry.
          done();
        }, 400);

      }, 5000);
    }, 2000);
  });
});

function click(x,y){
    var ev = document.createEvent("MouseEvent");
    var el = document.elementFromPoint(x,y);
    ev.initMouseEvent(
        "click",
        true /* bubble */, true /* cancelable */,
        window, null,
        x, y, 0, 0, /* coordinates */
        false, false, false, false, /* modifier keys */
        0 /*left*/, null
    );
    el.dispatchEvent(ev);
}
