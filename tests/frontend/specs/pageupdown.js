'use strict';

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
