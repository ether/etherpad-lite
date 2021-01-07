'use strict';

describe('Shift Page Up/Down', function () {
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

  it('highlights lines on shift page down and releases them on page up', async function () {
    await helper.edit('xxx', 1); // caret is offset 6

    helper.pageUp();
    helper.pageDown({
      shift: true,
    });
    await helper.waitForPromise(() => helper.padInner$.document.getSelection().type === 'Range');

    helper.pageUp({
      shift: true,
    });
    await helper.waitForPromise(() => helper.padInner$.document.getSelection().type === 'Caret');
  });
  it('highlights lines on shift pg down and maintains first selection on pg up', async function () {
    await helper.edit('xxx', 1); // caret is offset 6

    helper.pageUp();
    helper.pageDown({
      shift: true,
    });
    await helper.waitForPromise(() => helper.padInner$.document.getSelection().type === 'Range');

    helper.pageDown({
      shift: true,
    });
    await helper.waitForPromise(() => helper.padInner$.document.getSelection().type === 'Range');

    helper.pageUp({
      shift: true,
    });
    await helper.waitForPromise(() => helper.padInner$.document.getSelection().type === 'Range');
  });

  it(`Highlights from end of document on pg up
      then releases them on shift pg down`, async function () {
    // TODO: JM NEEDS HELP:  Why isn't this working?  It works if you do the same in browser..

    await helper.waitForPromise(() => helper.caretLineNumber() >= 201);
    // make sure we're at bottom
    helper.pageDown({
      pressAndHold: true,
    });
    await helper.waitForPromise(() => helper.caretLineNumber() >= 201);

    helper.pageUp({
      shift: true,
    });
    await helper.waitForPromise(() => helper.padInner$.document.getSelection().type === 'Range');

    helper.pageDown({
      shift: true,
    });
    await helper.waitForPromise(() => helper.padInner$.document.getSelection().type === 'Caret');
    throw new Error('I NEED HELPZ PLZ');
  });
  it(`highlights from end of document on pg up twice
      and retains on single pg down`, async function () {
    helper.pageUp({
      shift: true,
    });
    await helper.waitForPromise(() => helper.padInner$.document.getSelection().type === 'Range');

    helper.pageUp({
      shift: true,
    });
    await helper.waitForPromise(() => helper.padInner$.document.getSelection().type === 'Range');

    helper.pageDown({
      shift: true,
    });
    await helper.waitForPromise(() => helper.padInner$.document.getSelection().type === 'Range');
  });

  it(`highlights from 3rd line on page up twice
      should keep highlight`, async function () {
    await helper.edit('xxx', 3); // caret is offset 6

    helper.pageUp({
      shift: true,
    });
    await helper.waitForPromise(() => helper.padInner$.document.getSelection().type === 'Range');

    helper.pageUp({
      shift: true,
    });
    await helper.waitForPromise(() => helper.padInner$.document.getSelection().type === 'Range');
  });
  xit(`highlights range forward then hit page up, selStart should be prior to initial
        selStart and selEnd should be the original selStart`, async function () {
    // TODO: JM Needs help, need a way to just select this line but it needs direction
    // {select} wont cut the mustard
    // selStartFocus is internal to rep
  });

  xit(`highlights (a few lines) range forwards then hit page down, selStart should be initial
        selStart and selEnd further than original selEnd`, async function () {
    throw new Error('JM TO DO');
  });

  xit(`highlights (a few lines) range backwards (rep.selFocusAtStart) then hit page up, selEnd
        should be initial selStart,
        selStart should be less than original selStart`, async function () {
    throw new Error('JM TO DO');
  });

  xit(`highlights (a few lines) range backwards (rep.selFocusAtStart) then hit page down, selStart
        should be initial selEnd and selEnd further than original selEnd`, async function () {
    throw new Error('JM TO DO');
  });
});
