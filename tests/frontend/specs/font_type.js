describe("font select", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("makes text RobotoMono", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //get the font menu and RobotoMono option
    var $viewfontmenu = chrome$("#viewfontmenu");
    var $RobotoMonooption = $viewfontmenu.find("[value=RobotoMono]");

    //select RobotoMono and fire change event
    // $RobotoMonooption.attr('selected','selected');
    // commenting out above will break safari test
    $viewfontmenu.val("RobotoMono");
    $viewfontmenu.change();

    //check if font changed to RobotoMono
    var fontFamily = inner$("body").css("font-family").toLowerCase();
    var containsStr = fontFamily.indexOf("robotomono");
    expect(containsStr).to.not.be(-1);

    done();
  });
});
