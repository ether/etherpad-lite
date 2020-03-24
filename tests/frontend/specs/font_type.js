describe("font select", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("makes text monospace", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //get the font menu and monospace option
    var $viewfontmenu = chrome$("#viewfontmenu");
    var $monospaceoption = $viewfontmenu.find("[value=monospace]");

    //select monospace and fire change event
    $monospaceoption.attr('selected','selected');
    $viewfontmenu.val("monospace");
    $viewfontmenu.change();

    //check if font changed to monospace
    var fontFamily = inner$("body").css("font-family").toLowerCase();
    var containsStr = fontFamily.indexOf("monospace");
    expect(containsStr).to.not.be(-1);

    done();
  });
});
