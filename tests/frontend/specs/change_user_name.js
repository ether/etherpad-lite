describe("change username value", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("Changing username from one value to another sticks", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //click on the settings button to make settings visible
    var $userButton = chrome$(".buttonicon-showusers");
    $userButton.click();
    
    var $usernameInput = chrome$("#myusernameedit");
    $usernameInput.click();

    $usernameInput.sendkeys('{selectall}');
    $usernameInput.sendkeys('{del}');
    $usernameInput.sendkeys('Hairy Robot');
    $usernameInput.sendkeys('{enter}');

    $usernameInput.sendkeys('{selectall}');
    $usernameInput.sendkeys('{del}');
    $usernameInput.sendkeys('John McLear');
    $usernameInput.sendkeys('{enter}');


    var correctUsernameValue = $usernameInput.val() === "John McLear";

    //check if the username has been changed to John McLear
    expect(correctUsernameValue).to.be(true);
    done();
  });


  it("changing username is to the value we expect", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

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
      var containsJohnMcLear = $firstChatMessage.text().indexOf("John McLear") !== -1; // does the string contain John McLear
      expect(containsJohnMcLear).to.be(true); // expect the first chat message to contain JohnMcLear
    });
    done();
  });

  it("make sure the username has stuck when we create a new pad", function(done){
    beforeEach(function(cb){ // create another pad..  
      helper.newPad(cb);
      this.timeout(60000);
    });

    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;
    var $usernameInput = chrome$("#myusernameedit");

    var rememberedName = $usernameInput.val() === "John McLear";
    var rememberedWrongName = $usernameInput.val() === "Hairy Robot";
    expect(rememberedName).to.be(true); // expect it to remember the name of the user
    expect(rememberedWrongName).to.be(false); // expect it to forget any old names..
    done();
  }); 
});
