'use strict';

describe('Press and Hold Page Up/Down', function () {
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
  it('page up press and hold to top', async function () {
    // by default page down when caret is at end of the document will leave it in the same place.
    // viewport based pageup/down changes that
    helper.pageUp({
      pressAndHold: true,
    });
    await helper.waitForPromise(() => helper.caretLineNumber() === 1);
  });
  it('page down press and hold to bottom', async function () {
    // by default page down when caret is at end of the document will leave it in the same place.
    // viewport based pageup/down changes that
    const initialLineNumber = helper.caretLineNumber();
    helper.pageDown({
      pressAndHold: true,
    });
    await helper.waitForPromise(() => helper.caretLineNumber() === initialLineNumber);
  });
});
