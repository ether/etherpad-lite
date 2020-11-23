describe('change username value', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('Remembers the user name after a refresh', function (done) {
    this.timeout(60000);
    const chrome$ = helper.padChrome$;

    // click on the settings button to make settings visible
    const $userButton = chrome$('.buttonicon-showusers');
    $userButton.click();

    const $usernameInput = chrome$('#myusernameedit');
    $usernameInput.click();

    $usernameInput.val('John McLear');
    $usernameInput.blur();

    setTimeout(() => { // give it a second to save the username on the server side
      helper.newPad({ // get a new pad, but don't clear the cookies
        clearCookies: false,
        cb() {
          const chrome$ = helper.padChrome$;

          // click on the settings button to make settings visible
          const $userButton = chrome$('.buttonicon-showusers');
          $userButton.click();

          const $usernameInput = chrome$('#myusernameedit');
          expect($usernameInput.val()).to.be('John McLear');
          done();
        },
      });
    }, 1000);
  });


  it('Own user name is shown when you enter a chat', function (done) {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // click on the settings button to make settings visible
    const $userButton = chrome$('.buttonicon-showusers');
    $userButton.click();

    const $usernameInput = chrome$('#myusernameedit');
    $usernameInput.click();

    $usernameInput.val('John McLear');
    $usernameInput.blur();

    // click on the chat button to make chat visible
    const $chatButton = chrome$('#chaticon');
    $chatButton.click();
    const $chatInput = chrome$('#chatinput');
    $chatInput.sendkeys('O hi'); // simulate a keypress of typing JohnMcLear
    $chatInput.sendkeys('{enter}'); // simulate a keypress of enter actually does evt.which = 10 not 13

    // check if chat shows up
    helper.waitFor(() => chrome$('#chattext').children('p').length !== 0, // wait until the chat message shows up
    ).done(() => {
      const $firstChatMessage = chrome$('#chattext').children('p');
      const containsJohnMcLear = $firstChatMessage.text().indexOf('John McLear') !== -1; // does the string contain John McLear
      expect(containsJohnMcLear).to.be(true); // expect the first chat message to contain JohnMcLear
      done();
    });
  });
});
