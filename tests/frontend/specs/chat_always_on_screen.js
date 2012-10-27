describe("chat always ons creen select", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(5000);
  });

  it("makes chat stick to right side of the screen", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //get the chat selector
    var $stickychatCheckbox = chrome$("#options-stickychat");

    //select monospace and fire change event
    $stickychatCheckbox.attr('selected','selected');
    $stickychatCheckbox.change();

    //check if chat changed to get the stickychat Class
    var hasStickyChatClass = chrome$(".chatbox").hasClass("stickychat");
    expect(hasStickyChatClass).to.be(true);

    done();
  });
});
