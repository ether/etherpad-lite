describe("timeslider", function(){
  var padId = 735773577357+(Math.round(Math.random()*1000));

  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb, padId);
    this.timeout(60000);
  });

  it("Makes sure the export URIs are as expected when the padID is numeric", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    // make some changes to produce 100 revisions
    var revs = 10;
    this.timeout(60000);
    for(var i=0; i < revs; i++) {
      setTimeout(function() {
        // enter 'a' in the first text element
        inner$("div").first().sendkeys('a');
      }, 100);
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
          // expect URI to be similar to
          // http://192.168.1.48:9001/p/2/2/export/html
          // http://192.168.1.48:9001/p/735773577399/0/export/html
          var exportLink = timeslider$('#exporthtmla').attr('href');
          var checkVal = padId + "/0/export/html";
          var includesCorrectURI = exportLink.indexOf(checkVal);
          expect(includesCorrectURI).to.not.be(-1);
          done();
        }, 400);
      }, 2000);
    }, 2000);
  });
});
