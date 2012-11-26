describe("timeslider", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(6000);
  });

  it("loads adds a hundred revisions", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 
    
    // make some changes to produce 100 revisions
    var timePerRev = 900
      , revs = 150;
    this.timeout(revs*timePerRev+10000);
    for(var i=0; i < revs; i++) {
      setTimeout(function() {
        // type 'a' in the first text element
        inner$("div").first().sendkeys('a');
      }, timePerRev*i);
    }
    
    setTimeout(function() {
      $('#iframe-container iframe').attr('src', $('#iframe-container iframe').attr('src')+'/timeslider');
      
      var timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
      
      var $sliderHandle = timeslider$('#timeslider-slider ui-slider-handle');
  /*
      //get the strikethrough button and click it
      var $strikethroughButton = chrome$(".buttonicon-strikethrough");
      $strikethroughButton.click();
      
      //ace creates a new dom element when you press a button, so just get the first text element again
      var $newFirstTextElement = inner$("div").first();
      
      // is there a <i> element now?
      var isstrikethrough = $newFirstTextElement.find("s").length === 1;

      //expect it to be strikethrough
      expect(isstrikethrough).to.be(true);

      //make sure the text hasn't changed
      expect($newFirstTextElement.text()).to.eql($firstTextElement.text());
  */
      done();
    }, revs*timePerRev);
  });
});
