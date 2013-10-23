describe("rtl button", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("rtl with button", function(done){
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$;

    var $indentButton = chrome$(".buttonicon-rtl");
    $indentButton.click();

    helper.waitFor(function(){
      return inner$("div").first().find("div.rtl").length === 1;
    }).done(done);
  });
});
