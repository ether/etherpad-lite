'use strict';

describe('change username value', function () {
  // create a new pad before each test run
  beforeEach(async function () {
    await helper.aNewPad();
  });

  it('Remembers the user name after a refresh', async function () {
    this.timeout(10000);
    await helper.toggleUserList();
    await helper.setUserName('😃');
    // get a new pad, but don't clear the cookies
    await helper.aNewPad({clearCookies: false});
    await helper.toggleUserList();
    expect(helper.usernameField().val()).to.be('😃');
  });

  it('Own user name is shown when you enter a chat', async function () {
    this.timeout(10000);
    await helper.toggleUserList();
    await helper.setUserName('😃');

    await helper.showChat();
    await helper.sendChatMessage('O hi{enter}');

    await helper.waitForPromise(() => {
      // username:hours:minutes text
      const chatText = helper.chatTextParagraphs().text();
      return chatText.indexOf('😃') === 0;
    });
  });
});
