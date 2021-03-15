'use strict';

// Wait helper function, for simulating words per minute.
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// Test for https://github.com/ether/etherpad-lite/issues/1763
describe('Responsiveness of Editor', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb, 'TEST_PAD_collab');
    this.timeout(120000);
  });

  it('Fast response to keypress in pad with large amount of contents', async function () {
    this.timeout(120000);
    if (top.window.location.search.indexOf('&collab=true') === -1) this.skip();
    const numberOfEdits = 3000; // creates 700+ lines
    const allowableLatency = 100; // allow 100 ms of latency to see our edit

    // wait a minute for everyone to connect, this is skipped if &test=true is in the url
    // so that it's easier to do local debug/testing without lots of users connected
    if (top.window.location.search.indexOf('&test=true') === -1) {
      await helper.waitForPromise(
          () => parseInt(helper.padChrome$('#online_count').text()) >= 4, 60000);
    }

    let i = 0;
    while (i < numberOfEdits) {
      helper.padOuter$('#outerdocbody').scrollTop(helper.padOuter$('#outerdocbody').height());
      // move the caret to increase randomness of span lengths and increase likelihood that this
      // authors content is within another authors span.
      helper.padInner$('div').last().sendkeys('{rightarrow}');
      helper.padInner$('div').last().sendkeys('{rightarrow}');
      helper.padInner$('div').last().sendkeys('{rightarrow}');
      helper.padInner$('div').last().sendkeys('{rightarrow}');
      // Put the text contents into the pad
      // intentional white space at end of string
      helper.padInner$('div').last().sendkeys(`${i}: ${Math.random().toString(36).substring(7)} `);
      // 5% chance for every word we will do an enter
      if (Math.random() < 0.05) {
        helper.padInner$('div').last().sendkeys('{leftarrow}'); // To force enter on Chrome?
        helper.padInner$('div').last().sendkeys('{enter}');
      }
      // wait 1500 milliseconds to simulate 40wpm if you have 20 authors you would do this
      // but to speed up the test and as we only have 5 authors, we can do things ~7 times faster
      await wait(200);
      i++;
    }

    // do an edit, ensure it's on the screen within x ms.
    const rand = Math.random().toString(36).substring(7);
    helper.padInner$('div').last().sendkeys(`finaledit: ${rand}`);
    await helper.waitForPromise(
        () => helper.padInner$('div').text().indexOf(rand) !== -1, allowableLatency);
  });
});
