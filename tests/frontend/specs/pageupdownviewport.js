'use strict';

describe('Viewport based Page Up/Down', function () {
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
  it('page up when top is at 100 and caret is at bottom', async function () {
    // by default page down when caret is at end of the document will leave it in the same place.
    // viewport based pageup/down changes that
    const initialLineNumber = helper.caretLineNumber();
    helper.pageDown();
    helper.padOuter$('#outerdocbody').parent().scrollTop(100);
    helper.pageUp();
    await helper.waitForPromise(() => helper.caretLineNumber() < initialLineNumber);
  });

  it('page down when top is at 0 and caret is at bottom', async function () {
    // by default page down when caret is at end of the document will leave it in the same place.
    // viewport based pageup/down changes that
    const initialLineNumber = helper.caretLineNumber();
    helper.padOuter$('#outerdocbody').parent().scrollTop(0);
    await helper.waitForPromise(() => helper.padOuter$('#outerdocbody').parent().scrollTop() === 0);
    helper.pageUp(); // I think this might not be right..
    helper.pageDown();

    await helper.waitForPromise(() => (helper
        .caretLineNumber() < initialLineNumber) && (helper.caretLineNumber() > 1));
  });
});
