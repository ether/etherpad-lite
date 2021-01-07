'use strict';

describe(`Really long text line goes to character within text line if text line is last
      line in viewport if the second line is also incredibly long`, function () {
  beforeEach(function (cb) {
    helper.newPad({
      cb: async () => {
        await helper.clearPad();
        // 200 lines
        await helper.edit(
            'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
          'hello world hello world hello world hello world hello world hello world hello world\n ' +
          'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        'hello world hello world hello world hello world hello world hello world hello world ' +
        '\n\n\n\n\n\n\n\n\n ');
        cb();
      },
    });
  });

  it('Pg down on long line keeps char on the same line but with large X offset', async function () {
    await helper.edit('xxx', 1); // caret is offset 6
    await helper.waitForPromise(() => {
      if ((helper.padInner$.document.getSelection().anchorOffset === 0) &&
          (helper.caretLineNumber() === 1)) {
        return true;
      } else {
        helper.pageUp();
      }
    });
    helper.pageDown();
    await helper.waitForPromise(() => {
      if ((helper.padInner$.document.getSelection().anchorOffset > 0) &&
          (helper.caretLineNumber() === 1)) {
        return true;
      }
    });
    helper.pageUp();
    await helper.waitForPromise(() => {
      if ((helper.padInner$.document.getSelection().anchorOffset > 0) &&
          (helper.caretLineNumber() === 1)) {
        return true;
      }
    });
  });
});
