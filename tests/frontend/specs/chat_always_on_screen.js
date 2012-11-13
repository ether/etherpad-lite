describe("chat always ons creen select", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("makes chat stick to right side of the screen", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //get the chat selector
    var $stickychatCheckbox = chrome$("#options-stickychat");

    //select chat always on screen and fire change event
    $stickychatCheckbox.attr('selected','selected');
    $stickychatCheckbox.change();
    $stickychatCheckbox.click();

    //check if chat changed to get the stickychat Class
    var $chatbox = chrome$("#chatbox");
    var hasStickyChatClass = $chatbox.hasClass("stickyChat");
    expect(hasStickyChatClass).to.be(true);

    //select chat always on screen and fire change event
    $stickychatCheckbox.attr('selected','selected');
    $stickychatCheckbox.change();
    $stickychatCheckbox.click();

    //check if chat changed to remove the stickychat Class
    var hasStickyChatClass = $chatbox.hasClass("stickyChat");
    expect(hasStickyChatClass).to.be(false);

    done();
  });
});
