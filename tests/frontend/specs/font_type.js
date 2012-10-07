describe("font select", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    testHelper.newPad(cb);
    this.timeout(5000);
  });

  it("makes text monospace", function() {
    //get the inner iframe
    var $inner = testHelper.$getPadInner();

    //open pad settings
    var $settingsButton = testHelper.$getPadChrome().find(".buttonicon-settings");
    $settingsButton.click();

    //get the font selector and click it
    var $viewfontmenu = testHelper.$getPadChrome().find("#viewfontmenu"); 
    $viewfontmenu.click();

    //get the monospace option and click it
    var $monospaceoption = testHelper.$getPadChrome().find("[value=monospace]");
    $monospaceoption.attr('selected','selected');

    /*

    //get the font selector and click it
    var $viewfontmenu = testHelper.$getPadChrome().find("#viewfontmenu"); 
    $viewfontmenu.click(); // this doesnt work but I left it in for posterity.
    $($viewfontmenu).attr('size',2); // this hack is required to make it visible ;\

    //get the monospace option and click it
    var $monospaceoption = testHelper.$getPadChrome().find("[value=monospace]");
    $monospaceoption.attr('selected','selected'); // despite this being selected the event doesnt fire
    $monospaceoption.click(); // this doesnt work but it should.

    */

    // get the attributes of the body of the editor iframe
    var bodyAttr = $inner.find("body");
    var cssText = bodyAttr[0].style.cssText;

    //make sure the text hasn't changed
    expect(cssText).to.eql("font-family: monospace;");
  });
});
