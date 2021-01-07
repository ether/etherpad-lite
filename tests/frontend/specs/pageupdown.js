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
