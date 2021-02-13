'use strict';

describe('change username value', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
  });

  it('Remembers the user name after a refresh', async function () {
    this.timeout(1500);
    helper.toggleUserList();
    helper.setUserName('😃');

    helper.newPad({ // get a new pad, but don't clear the cookies
      clearCookies: false,
      cb() {
        helper.toggleUserList();

        expect(helper.usernameField().val()).to.be('😃');
      },
    });
  });

  it('Own user name is shown when you enter a chat', async function () {
    this.timeout(1500);
    helper.toggleUserList();
    helper.setUserName('😃');

    helper.showChat();
    helper.sendChatMessage('O hi{enter}');

    await helper.waitForPromise(() => {
      // username:hours:minutes text
      const chatText = helper.chatTextParagraphs().text();
      return chatText.indexOf('😃') === 0;
    });
  });
});
