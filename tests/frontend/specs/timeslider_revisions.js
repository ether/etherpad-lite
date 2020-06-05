describe("timeslider", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(6000);
  });

  it("loads adds a hundred revisions", function(done) { // passes
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    // make some changes to produce 100 revisions
    var timePerRev = 900
      , revs = 99;
    this.timeout(revs*timePerRev+10000);
    for(var i=0; i < revs; i++) {
      setTimeout(function() {
        // enter 'a' in the first text element
        inner$("div").first().sendkeys('a');
      }, timePerRev*i);
    }
    chrome$('.buttonicon-savedRevision').click();

    setTimeout(function() {
      // go to timeslider
      $('#iframe-container iframe').attr('src', $('#iframe-container iframe').attr('src')+'/timeslider');

      setTimeout(function() {
        var timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
        var $sliderBar = timeslider$('#ui-slider-bar');

        var latestContents = timeslider$('#innerdocbody').text();

        // Click somewhere on the timeslider
        var e = new jQuery.Event('mousedown');
        // sets y co-ordinate of the pad slider modal.
        var base = (timeslider$('#ui-slider-bar').offset().top - 24)
        e.clientX = e.pageX = 150;
        e.clientY = e.pageY = base+5;
        $sliderBar.trigger(e);

        e = new jQuery.Event('mousedown');
        e.clientX = e.pageX = 150;
        e.clientY = e.pageY = base;
        $sliderBar.trigger(e);

        e = new jQuery.Event('mousedown');
        e.clientX = e.pageX = 150;
        e.clientY = e.pageY = base-5;
        $sliderBar.trigger(e);

        $sliderBar.trigger('mouseup')

        setTimeout(function() {
          //make sure the text has changed
          expect( timeslider$('#innerdocbody').text() ).not.to.eql( latestContents );
          var starIsVisible = timeslider$('.star').is(":visible");
          expect( starIsVisible ).to.eql( true );
          done();
        }, 1000);

      }, 6000);
    }, revs*timePerRev);
  });


  // Disabled as jquery trigger no longer works properly
  xit("changes the url when clicking on the timeslider", function(done) {
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

        var latestContents = timeslider$('#innerdocbody').text();
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
  it("jumps to a revision given in the url", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;
    this.timeout(20000);

    // wait for the text to be loaded
    helper.waitFor(function(){
      return inner$('body').text().length != 0;
    }, 6000).always(function() {
      var newLines = inner$('body div').length;
      var oldLength = inner$('body').text().length + newLines / 2;
      expect( oldLength ).to.not.eql( 0 );
      inner$("div").first().sendkeys('a');
      var timeslider$;

      // wait for our additional revision to be added
      helper.waitFor(function(){
        // newLines takes the new lines into account which are strippen when using
        // inner$('body').text(), one <div> is used for one line in ACE.
        var lenOkay = inner$('body').text().length + newLines / 2 != oldLength;
        // this waits for the color to be added to our <span>, which means that the revision
        // was accepted by the server.
        var colorOkay = inner$('span').first().attr('class').indexOf("author-") == 0;
        return lenOkay && colorOkay;
      }, 6000).always(function() {
        // go to timeslider with a specific revision set
        $('#iframe-container iframe').attr('src', $('#iframe-container iframe').attr('src')+'/timeslider#0');

        // wait for the timeslider to be loaded
        helper.waitFor(function(){
          try {
            timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
          } catch(e){}
          if(timeslider$){
            return timeslider$('#innerdocbody').text().length == oldLength;
          }
        }, 6000).always(function(){
          expect( timeslider$('#innerdocbody').text().length ).to.eql( oldLength );
          done();
        });
      });
    });
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
