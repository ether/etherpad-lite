describe("Chat messages and UI", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
  });

  it("opens chat, sends a message, makes sure it exists on the page and hides chat", async function() {
    var chatValue = "JohnMcLear";

    await helper.showChat();
    await helper.sendChatMessage(`${chatValue}{enter}`);

    expect(helper.chatTextParagraphs().length).to.be(1);

    // <p data-authorid="a.qjkwNs4z0pPROphS"
    //   class="author-a-qjkwz78zs4z122z0pz80zz82zz79zphz83z">
    //   <b>unnamed:</b>
    //   <span class="time author-a-qjkwz78zs4z122z0pz80zz82zz79zphz83z">12:38
    //   </span> JohnMcLear
    // </p>
    let username = helper.chatTextParagraphs().children("b").text();
    let time = helper.chatTextParagraphs().children(".time").text();

    expect(helper.chatTextParagraphs().text()).to.be(`${username}${time} ${chatValue}`);

    await helper.hideChat();
  });

  it("makes sure that an empty message can't be sent", async function() {
    var chatValue = "mluto";

    await helper.showChat();

    await helper.sendChatMessage(`{enter}${chatValue}{enter}`); // simulate a keypress of typing enter, mluto and enter (to send 'mluto')

    let chat = helper.chatTextParagraphs();

    expect(chat.length).to.be(1);

    // check that the received message is not the empty one
    let username = chat.children("b").text();
    let time = chat.children(".time").text();

    expect(chat.text()).to.be(`${username}${time} ${chatValue}`);
  });

  it("makes chat stick to right side of the screen via settings, remove sticky via settings, close it", async function() {
    await helper.showSettings();

    await helper.enableStickyChatviaSettings();
    expect(helper.isChatboxShown()).to.be(true);
    expect(helper.isChatboxSticky()).to.be(true);

    await helper.disableStickyChatviaSettings();
    expect(helper.isChatboxSticky()).to.be(false);
    expect(helper.isChatboxShown()).to.be(true);

    await helper.hideChat();
    expect(helper.isChatboxSticky()).to.be(false);
    expect(helper.isChatboxShown()).to.be(false);
  });

  it("makes chat stick to right side of the screen via icon on the top right, remove sticky via icon, close it", async function() {
    await helper.showChat();

    await helper.enableStickyChatviaIcon();
    expect(helper.isChatboxShown()).to.be(true);
    expect(helper.isChatboxSticky()).to.be(true);

    await helper.disableStickyChatviaIcon();
    expect(helper.isChatboxShown()).to.be(true);
    expect(helper.isChatboxSticky()).to.be(false);

    await helper.hideChat();
    expect(helper.isChatboxSticky()).to.be(false);
    expect(helper.isChatboxShown()).to.be(false);
  });

  xit("Checks showChat=false URL Parameter hides chat then when removed it shows chat", function(done) {
    this.timeout(60000);
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    setTimeout(function(){ //give it a second to save the username on the server side
      helper.newPad({ // get a new pad, but don't clear the cookies
        clearCookies: false,
        params:{
          showChat: "false"
        }, cb: function(){
          var chrome$ = helper.padChrome$;
          var chaticon = chrome$("#chaticon");
          // chat should be hidden.
          expect(chaticon.is(":visible")).to.be(false);

          setTimeout(function(){ //give it a second to save the username on the server side
            helper.newPad({ // get a new pad, but don't clear the cookies
              clearCookies: false
              , cb: function(){
                var chrome$ = helper.padChrome$;
                var chaticon = chrome$("#chaticon");
                // chat should be visible.
                expect(chaticon.is(":visible")).to.be(true);
                done();
              }
            });
          }, 1000);

        }
      });
    }, 1000);

  });

});
