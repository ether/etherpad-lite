describe("rtl button", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("rtl with button", function(done){
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$;

    var $rtlButton = chrome$(".buttonicon-rtl");
    $rtlButton.click();

    helper.waitFor(function(){
      return inner$("div").first().find("div.rtl").length === 1;
    }).done(done);
  });

  it("rtl is reversible", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    var $rtlButton = chrome$(".buttonicon-rtl");
    $rtlButton.click();

    helper.waitFor(function(){
	    $rtlButton.click();
    	helper.waitFor(function(){
      		return inner$("div").first().find("div.rtl").length === 0;
	    }).done(done);
    }).done(done);
  });

});
