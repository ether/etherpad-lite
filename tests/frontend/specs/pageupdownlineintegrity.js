'use strict';

describe('Line number integrity is kept between page up/down', function () {
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
        cb();
      },
    });
  });

  const lineHistory = [];

  it('Page down x times, then page up and see if lines match', async function () {
    // this places the caret in the first line
    await helper.edit('Line 1', 1);

    const currentLineNumber = helper.caretLineNumber();
    lineHistory.push(helper.caretLineNumber());

    helper.pageDown();
    await helper.waitForPromise(() => currentLineNumber < helper.caretLineNumber());
    lineHistory.push(helper.caretLineNumber());

    helper.pageDown();
    await helper.waitForPromise(() => currentLineNumber < helper.caretLineNumber());
    lineHistory.push(helper.caretLineNumber());

    helper.pageDown();
    await helper.waitForPromise(() => currentLineNumber < helper.caretLineNumber());

    let futureLineNumber = helper.caretLineNumber();
    helper.pageUp();
    await helper.waitForPromise(() => futureLineNumber > helper.caretLineNumber());
    if (helper.caretLineNumber() !== lineHistory[lineHistory.length - 1]) {
      throw new Error('Line History not being properly maintained on page up #1');
    }
    lineHistory.pop();

    futureLineNumber = helper.caretLineNumber();
    helper.pageUp();
    await helper.waitForPromise(() => futureLineNumber > helper.caretLineNumber());
    if (helper.caretLineNumber() !== lineHistory[lineHistory.length - 1]) {
      throw new Error('Line History not being properly maintained on page up #2');
    }
  });
});
