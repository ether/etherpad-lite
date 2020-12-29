'use strict';
/*
describe('Page Up/Down', function () {
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
          '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n');
        cb()
      }
    });
  });

  // scrolls up 3 times
  it('scrolls up on key stroke', async function(){
    let currentLineNumber = helper.caretLineNumber();
    helper.pageUp();
    await helper.waitForPromise(() => currentLineNumber > helper.caretLineNumber());

    currentLineNumber = helper.caretLineNumber();
    helper.pageUp();
    await helper.waitForPromise(() => currentLineNumber > helper.caretLineNumber());

    currentLineNumber = helper.caretLineNumber();
    helper.pageUp();
    await helper.waitForPromise(() => currentLineNumber > helper.caretLineNumber());
  })

  // scrolls down 3 times
  it('scrolls down on key stroke', async function(){
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
  })
})
*/

describe('Page Up/Down Beginning and End position', function () {
  beforeEach(function (cb) {
    helper.newPad({
      cb: async () => {
        await helper.clearPad();
        // 200 lines
        await helper.edit(
            '\n\n\n\nhello');
        cb();
      },
    });
  });

  it('scrolls to very end content on page down when viewport is at bottom of document', async function () {
    // this places the caret in the first line
    await helper.edit('Line 1', 1);

    const currentLineNumber = helper.caretLineNumber();
    helper.pageDown();
    await helper.waitForPromise(() => currentLineNumber < helper.caretLineNumber());

    // make sure caret is after hello
    const pos = helper.padInner$.document.getSelection();
    await helper.waitForPromise(() => pos.anchorOffset > 0);
  });

  // scrolls down 3 times - caret should be AFTER "hello
  it('scrolls to very beginning content on page up when viewport is at bottom of document', async function () {
    // this places the caret in the first line
    await helper.edit('Line 1', 1);

    const currentLineNumber = helper.caretLineNumber();
    helper.pageUp();
    await helper.waitForPromise(() => currentLineNumber > helper.caretLineNumber());

    // make sure caret is after hello
    const pos = helper.padInner$.document.getSelection();
    await helper.waitForPromise(() => pos.anchorOffset === 0);
  });

/*
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
  */
});
