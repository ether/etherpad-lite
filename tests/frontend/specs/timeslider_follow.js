describe("timeslider", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(6000);
  });

  it("follow content as it's added to timeslider", function(done) { // passes
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    // make some changes to produce 100 revisions
    var timePerRev = 900
      , revs = 10;
    this.timeout(revs*timePerRev+10000);
    for(var i=0; i < revs; i++) {
      setTimeout(function() {
        // enter 'a' in the first text element
        inner$("div").last().sendkeys('a\n');
        inner$("div").last().sendkeys('{enter}');
        inner$("div").last().sendkeys('{enter}');
        inner$("div").last().sendkeys('{enter}');
        inner$("div").last().sendkeys('{enter}');
      }, timePerRev*i);
    }

    setTimeout(function() {
      // go to timeslider
      $('#iframe-container iframe').attr('src', $('#iframe-container iframe').attr('src')+'/timeslider#0');

      setTimeout(function() {
        var timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
        var $sliderBar = timeslider$('#ui-slider-bar');

        var latestContents = timeslider$('#innerdocbody').text();

        // set to follow contents as it arrives
        timeslider$('#options-followContents').prop("checked", true);

        var originalTop = timeslider$('#innerdocbody').offset();
        timeslider$('#playpause_button_icon').click();

        setTimeout(function() {
          //make sure the text has changed
          var newTop = timeslider$('#innerdocbody').offset();
          expect( originalTop ).not.to.eql( newTop );
          done();
        }, 1000);

      }, 2000);
    }, revs*timePerRev);
  });

});

