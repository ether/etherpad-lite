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

    done();
  });
});
