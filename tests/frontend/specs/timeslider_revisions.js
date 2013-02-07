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
  it("changes the url when clicking on the timeslider", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 
    
    // make some changes to produce 7 revisions
    var timePerRev = 1000
      , revs = 20;
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
        
        var oldUrl = $('#iframe-container iframe')[0].contentWindow.location.hash;
        
        // Click somewhere on the timeslider
        var e = new jQuery.Event('mousedown');
        e.clientX = e.pageX = 150;
        e.clientY = e.pageY = 60;
        $sliderBar.trigger(e);
        
        helper.waitFor(function(){
          return $('#iframe-container iframe')[0].contentWindow.location.hash != oldUrl;
        }, 6000).always(function(){
          expect( $('#iframe-container iframe')[0].contentWindow.location.hash ).not.to.eql( oldUrl );
          done();
        });
      }, 6000);
    }, revs*timePerRev);
  });
  // This test is bad because it expects char length to be static
  // A much better way would be get the charCount before sending new chars
  it("jumps to a revision given in the url", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 
    this.timeout(15000);
    inner$("div").first().sendkeys('a');
    
    setTimeout(function() {
      // go to timeslider with a specific revision set
      $('#iframe-container iframe').attr('src', $('#iframe-container iframe').attr('src')+'/timeslider#0');
      var timeslider$;
      
      helper.waitFor(function(){
        try{
          timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
        }catch(e){
        }
        if(timeslider$){
          return timeslider$('#padcontent').text().length == 230;
        }
      }, 6000).always(function(){
        expect( timeslider$('#padcontent').text().length ).to.eql( 230 );
        done();
      });
    }, 2500);
  });
  it("checks the export url", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 
    this.timeout(11000);
    inner$("div").first().sendkeys('a');
    
    setTimeout(function() {
      // go to timeslider
      $('#iframe-container iframe').attr('src', $('#iframe-container iframe').attr('src')+'/timeslider#0');
      var timeslider$;
      var exportLink;
      
      helper.waitFor(function(){
        try{
          timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
        }catch(e){}
        if(!timeslider$)
          return false;
        exportLink = timeslider$('#exportplaina').attr('href');
        if(!exportLink)
          return false;
        return exportLink.substr(exportLink.length - 12) == "0/export/txt";
      }, 6000).always(function(){
        expect( exportLink.substr(exportLink.length - 12) ).to.eql( "0/export/txt" );
        done();
      });
    }, 2500);
  });
});
