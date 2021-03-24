'use strict';

describe('Messages in the COLLABROOM', function () {
  const user1Text = 'text created by user 1';
  const user2Text = 'text created by user 2';

  const triggerEvent = (eventName) => {
    const event = new helper.padInner$.Event(eventName);
    helper.padInner$('#innerdocbody').trigger(event);
  };

  const replaceLineText = async (lineNumber, newText) => {
    const inner$ = helper.padInner$;

    // get the line element
    const $line = inner$('div').eq(lineNumber);

    // simulate key presses to delete content
    $line.sendkeys('{selectall}'); // select all
    $line.sendkeys('{del}'); // clear the first line
    $line.sendkeys(newText); // insert the string

    await helper.waitForPromise(() => inner$('div').eq(lineNumber).text() === newText);
  };

  before(async function () {
    this.timeout(10000);
    await helper.aNewPad();
    await helper.multipleUsers.init();
  });

  it('bug #4978 regression test', async function () {
    // The bug was triggered by receiving a change from another user while simultaneously composing
    // a character and waiting for an acknowledgement of a previously sent change.

    // User 1 starts sending a change to the server.
    let sendStarted;
    const finishSend = (() => {
      const socketJsonObj = helper.padChrome$.window.pad.socket.json;
      const sendBackup = socketJsonObj.send;
      let startSend;
      sendStarted = new Promise((resolve) => { startSend = resolve; });
      let finishSend;
      const sendP = new Promise((resolve) => { finishSend = resolve; });
      socketJsonObj.send = (...args) => {
        startSend();
        sendP.then(() => {
          socketJsonObj.send = sendBackup;
          socketJsonObj.send(...args);
        });
      };
      return finishSend;
    })();
    await replaceLineText(0, user1Text);
    await sendStarted;

    // User 1 starts a character composition.
    triggerEvent('compositionstart');

    // User 1 receives a change from user 2. (User 1 will not incorporate the change until the
    // composition is completed.)
    const user2ChangeArrivedAtUser1 = new Promise((resolve) => {
      const cc = helper.padChrome$.window.pad.collabClient;
      const origHM = cc.handleMessageFromServer;
      cc.handleMessageFromServer = (evt) => {
        if (evt.type === 'COLLABROOM' && evt.data.type === 'NEW_CHANGES') {
          cc.handleMessageFromServer = origHM;
          resolve();
        }
        return origHM.call(cc, evt);
      };
    });
    await helper.multipleUsers.performAsOtherUser(async () => await replaceLineText(1, user2Text));
    await user2ChangeArrivedAtUser1;

    // User 1 finishes sending the change to the server. User 2 should see the changes right away.
    finishSend();
    await helper.multipleUsers.performAsOtherUser(async () => await helper.waitForPromise(
        () => helper.padInner$('div').eq(0).text() === user1Text));

    // User 1 finishes the character composition. User 2's change should then become visible.
    triggerEvent('compositionend');
    await helper.waitForPromise(() => helper.padInner$('div').eq(1).text() === user2Text);

    // Users 1 and 2 make some more changes.
    await helper.multipleUsers.performAsOtherUser(async () => await replaceLineText(3, user2Text));
    await replaceLineText(2, user1Text);

    // All changes should appear in both views.
    const assertContent = async () => await helper.waitForPromise(() => {
      const expectedLines = [
        user1Text,
        user2Text,
        user1Text,
        user2Text,
      ];
      return expectedLines.every((txt, i) => helper.padInner$('div').eq(i).text() === txt);
    });
    await assertContent();
    await helper.multipleUsers.performAsOtherUser(assertContent);
  });
});
