describe("change username value", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(5000);
  });

  it("makes sure changing username works", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 

    //click on the settings button to make settings visible
    var $userButton = chrome$(".buttonicon-showusers");
    $userButton.click();
    
    var $usernameInput = chrome$("#myusernameedit");
    $usernameInput.click();

    $usernameInput.sendkeys('{selectall}');
    $usernameInput.sendkeys('{del}');
    $usernameInput.sendkeys('John McLear');
    $usernameInput.sendkeys('{enter}');

    var correctUsernameValue = $usernameInput.val() === "John McLear";

    //check if the username has been changed to John McLear
    expect(correctUsernameValue).to.be(true);



    //click on the chat button to make chat visible
    var $chatButton = chrome$("#chaticon");
    $chatButton.click();
    var $chatInput = chrome$("#chatinput");
    $chatInput.sendkeys('O hi'); // simulate a keypress of typing JohnMcLear
    $chatInput.sendkeys('{enter}'); // simulate a keypress of enter actually does evt.which = 10 not 13

    //check if chat shows up
    helper.waitFor(function(){
      return chrome$("#chattext").children("p").length !== 0; // wait until the chat message shows up
    }).done(function(){
      var $firstChatMessage = chrome$("#chattext").children("p");
      var containsJohnMcLear = $firstChatMessage.text().indexOf("John McLear") !== -1; // does the string contain Jo$
      expect(containsJohnMcLear).to.be(true); // expect the first chat message to contain JohnMcLear
    }); 

    done();
  });
});
