describe("timeslider", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(6000);
  });

  xit("loads adds a hundred revisions", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 
    
    // make some changes to produce 100 revisions
    var timePerRev = 900
      , revs = 100;
    this.timeout(revs*timePerRev+10000);
    for(var i=0; i < revs; i++) {
      setTimeout(function() {
        // enter 'a' in the first text element
        inner$("div").first().sendkeys('a');
      }, timePerRev*i);
    }
    
    setTimeout(function() {
      // go to timeslider
      $('#iframe-container iframe').attr('src', $('#iframe-container iframe').attr('src')+'/timeslider');
      
      setTimeout(function() {
        var timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
        var $sliderBar = timeslider$('#ui-slider-bar');
        
        var latestContents = timeslider$('#padcontent').text();

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
          expect( timeslider$('#padcontent').text() ).not.to.eql( latestContents );
          done();
        }, 1000);
        
      }, 6000);
    }, revs*timePerRev);
  });
});
