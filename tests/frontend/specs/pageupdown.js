'use strict';

describe('Page Up & Page Down', function () {
  beforeEach(function (cb) {
    helper.newPad({
      cb: async () => {
        await helper.clearPad();
        // 200 lines
        await helper.edit(
            '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n' +
          '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n' +
          '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n' +
          '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n' +
          '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nhello');
        cb();
      },
    });
  });

  // scrolls up 2 times
  it('scrolls up on key stroke', async function () {
    await helper.edit('Line 80', 80);
    await helper.waitForPromise(() => 81 === helper.caretLineNumber());
    // for some reason the page isn't inline with the edit
    helper.padOuter$('#outerdocbody').parent().scrollTop(1000);
    let intitialLineNumber = helper.caretLineNumber();
    helper.pageUp();
    await helper.waitForPromise(() => intitialLineNumber > helper.caretLineNumber());
    intitialLineNumber = helper.caretLineNumber();
    helper.pageUp();
    await helper.waitForPromise(() => intitialLineNumber > helper.caretLineNumber());
    await helper.waitForPromise(
        () => helper.padOuter$('#outerdocbody').parent().scrollTop() < 1000
    );
  });
  // scrolls down 3 times
  it('scrolls down on key stroke', async function () {
    // this places the caret in the first line
    await helper.edit('Line 1', 1);

    let currentLineNumber = helper.caretLineNumber();
    helper.pageDown();
    await helper.waitForPromise(() => currentLineNumber < helper.caretLineNumber());

    currentLineNumber = helper.caretLineNumber();
    helper.pageDown();
    await helper.waitForPromise(() => currentLineNumber < helper.caretLineNumber());

    currentLineNumber = helper.caretLineNumber();
    helper.pageDown();
    await helper.waitForPromise(() => currentLineNumber < helper.caretLineNumber());
  });
});
