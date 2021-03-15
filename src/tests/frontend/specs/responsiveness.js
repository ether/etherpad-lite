'use strict';

// Test for https://github.com/ether/etherpad-lite/issues/1763
describe('Responsiveness of Editor', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb, 'TEST_PAD_collab');
    this.timeout(6000);
  });

  it('Fast response to keypress in pad with large amount of contents', async function () {
    if (top.window.location.search.indexOf('&collab=true') === -1) this.skip();
    const numberOfEdits = 10; // TODO; edit to 1500 or so

    // wait a minute for everyone to connect
    await helper.waitForPromise(
        () => parseInt(helper.padChrome$('#online_count').text()) === 4, 60000);

    // send random characters to last div
    let i = 0;
    while (i < numberOfEdits) {
      // Put the text contents into the pad
      // intentional white space at end of string
      helper.padInner$('div').last().sendkeys(`${Math.random().toString(36).substring(7)} `);
      // wait 1500 milliseconds to simulate 40wpm
      await wait(1500);
      i++;
    }
  });
});

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
