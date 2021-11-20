'use strict';

describe('Chat messages and UI', function () {
  // create a new pad before each test run
  beforeEach(async function () {
    await helper.aNewPad();
  });

  it('opens chat, sends a message, makes sure it exists ' +
      'on the page and hides chat', async function () {
    this.timeout(3000);
    const chatValue = 'JohnMcLear';

    await helper.showChat();
    await helper.sendChatMessage(`${chatValue}{enter}`);

    expect(helper.chatTextParagraphs().length).to.be(1);

    // <p data-authorid="a.qjkwNs4z0pPROphS"
    //   class="author-a-qjkwz78zs4z122z0pz80zz82zz79zphz83z">
    //   <b>unnamed:</b>
    //   <span class="time author-a-qjkwz78zs4z122z0pz80zz82zz79zphz83z">12:38
    //   </span> JohnMcLear
    // </p>
    const username = helper.chatTextParagraphs().children('b').text();
    const time = helper.chatTextParagraphs().children('.time').text();

    // TODO: The '\n' is an artifact of $.sendkeys('{enter}'). Figure out how to get rid of it
    // without breaking the other tests that use $.sendkeys().
    expect(helper.chatTextParagraphs().text()).to.be(`${username}${time} ${chatValue}\n`);

    await helper.hideChat();
  });

  it("makes sure that an empty message can't be sent", async function () {
    const chatValue = 'mluto';

    await helper.showChat();

    // simulate a keypress of typing enter, mluto and enter (to send 'mluto')
    await helper.sendChatMessage(`{enter}${chatValue}{enter}`);

    const chat = helper.chatTextParagraphs();

    expect(chat.length).to.be(1);

    // check that the received message is not the empty one
    const username = chat.children('b').text();
    const time = chat.children('.time').text();

    // TODO: Each '\n' is an artifact of $.sendkeys('{enter}'). Figure out how to get rid of them
    // without breaking the other tests that use $.sendkeys().
    expect(chat.text()).to.be(`${username}${time} \n${chatValue}\n`);
  });

  it('makes chat stick to right side of the screen via settings, ' +
      'remove sticky via settings, close it', async function () {
    this.timeout(5000);
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

  it('makes chat stick to right side of the screen via icon on the top' +
      ' right, remove sticky via icon, close it', async function () {
    this.timeout(5000);
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

  xit('Checks showChat=false URL Parameter hides chat then' +
      ' when removed it shows chat', async function () {
    // give it a second to save the username on the server side
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // get a new pad, but don't clear the cookies
    await helper.aNewPad({clearCookies: false, params: {showChat: 'false'}});

    let chrome$ = helper.padChrome$;
    let chaticon = chrome$('#chaticon');
    // chat should be hidden.
    expect(chaticon.is(':visible')).to.be(false);

    // give it a second to save the username on the server side
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // get a new pad, but don't clear the cookies
    await helper.aNewPad({clearCookies: false});

    chrome$ = helper.padChrome$;
    chaticon = chrome$('#chaticon');
    // chat should be visible.
    expect(chaticon.is(':visible')).to.be(true);
  });
});
