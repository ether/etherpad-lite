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
    // because we don't send the edit via key events but using `sendkeys` the viewport is
    // not automatically scrolled. The line below puts the viewport top exactly to where
    // the caret is.
    let lineOffset = helper.linesDiv()[80][0].offsetTop;
    helper.padOuter$('#outerdocbody').parent().scrollTop(lineOffset);
    let intitialLineNumber = helper.caretLineNumber();
    helper.pageUp();
    await helper.waitForPromise(() => intitialLineNumber > helper.caretLineNumber() &&
                 lineOffset > helper.padOuter$('#outerdocbody').parent().scrollTop());
    intitialLineNumber = helper.caretLineNumber();
    lineOffset = helper.padOuter$('#outerdocbody').parent().scrollTop();
    helper.pageUp();
    await helper.waitForPromise(() => intitialLineNumber > helper.caretLineNumber() &&
                 lineOffset > helper.padOuter$('#outerdocbody').parent().scrollTop());
  });
  // scrolls down 3 times
  it('scrolls down on key stroke', async function () {
    // this places the caret in the first line
    await helper.edit('Line 1', 1);

    let currentLineNumber = helper.caretLineNumber();
    let lineOffset = helper.padOuter$('#outerdocbody').parent().scrollTop();
    helper.pageDown();
    await helper.waitForPromise(() => currentLineNumber < helper.caretLineNumber() &&
                 lineOffset < helper.padOuter$('#outerdocbody').parent().scrollTop());

    currentLineNumber = helper.caretLineNumber();
    lineOffset = helper.padOuter$('#outerdocbody').parent().scrollTop();
    helper.pageDown();
    await helper.waitForPromise(() => currentLineNumber < helper.caretLineNumber() &&
                 lineOffset < helper.padOuter$('#outerdocbody').parent().scrollTop());

    currentLineNumber = helper.caretLineNumber();
    lineOffset = helper.padOuter$('#outerdocbody').parent().scrollTop();
    helper.pageDown();
    await helper.waitForPromise(() => currentLineNumber < helper.caretLineNumber() &&
                 lineOffset < helper.padOuter$('#outerdocbody').parent().scrollTop());
  });
});
