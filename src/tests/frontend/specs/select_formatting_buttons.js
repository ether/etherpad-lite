'use strict';

describe('select formatting buttons when selection has style applied', function () {
  const STYLES = ['italic', 'bold', 'underline', 'strikethrough'];
  const SHORTCUT_KEYS = ['I', 'B', 'U', '5']; // italic, bold, underline, strikethrough
  const FIRST_LINE = 0;

  before(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  const applyStyleOnLine = function (style, line) {
    const chrome$ = helper.padChrome$;
    selectLine(line);
    const $formattingButton = chrome$(`.buttonicon-${style}`);
    $formattingButton.click();
  };

  const isButtonSelected = function (style) {
    const chrome$ = helper.padChrome$;
    const $formattingButton = chrome$(`.buttonicon-${style}`);
    return $formattingButton.parent().hasClass('selected');
  };

  const selectLine = function (lineNumber, offsetStart, offsetEnd) {
    const inner$ = helper.padInner$;
    const $line = inner$('div').eq(lineNumber);
    helper.selectLines($line, $line, offsetStart, offsetEnd);
  };

  const placeCaretOnLine = function (lineNumber) {
    const inner$ = helper.padInner$;
    const $line = inner$('div').eq(lineNumber);
    $line.sendkeys('{leftarrow}');
  };

  const undo = async function () {
    const originalHTML = helper.padInner$('body').html();
    const $undoButton = helper.padChrome$('.buttonicon-undo');
    $undoButton.click();
    await helper.waitForPromise(() => helper.padInner$('body').html() !== originalHTML);
  };

  const testIfFormattingButtonIsDeselected = function (style) {
    it(`deselects the ${style} button`, function (done) {
      this.timeout(100);
      helper.waitFor(() => isButtonSelected(style) === false).done(done);
    });
  };

  const testIfFormattingButtonIsSelected = function (style) {
    it(`selects the ${style} button`, function (done) {
      this.timeout(100);
      helper.waitFor(() => isButtonSelected(style)).done(done);
    });
  };

  const applyStyleOnLineAndSelectIt = function (line, style, cb) {
    applyStyleOnLineOnFullLineAndRemoveSelection(line, style, selectLine, cb);
  };

  const applyStyleOnLineAndPlaceCaretOnit = function (line, style, cb) {
    applyStyleOnLineOnFullLineAndRemoveSelection(line, style, placeCaretOnLine, cb);
  };

  const applyStyleOnLineOnFullLineAndRemoveSelection = function (line, style, selectTarget, cb) {
    // see if line html has changed
    const inner$ = helper.padInner$;
    const oldLineHTML = inner$.find('div')[line];
    applyStyleOnLine(style, line);

    helper.waitFor(() => {
      const lineHTML = inner$.find('div')[line];
      return lineHTML !== oldLineHTML;
    });
    // remove selection from previous line
    selectLine(line + 1);
    // setTimeout(function() {
    // select the text or place the caret on a position that
    // has the formatting text applied previously
    selectTarget(line);
    cb();
    // }, 1000);
  };

  const pressFormattingShortcutOnSelection = async function (key) {
    const inner$ = helper.padInner$;
    const originalHTML = helper.padInner$('body').html();

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // select this text element
    $firstTextElement.sendkeys('{selectall}');

    const e = new inner$.Event(helper.evtType);
    e.ctrlKey = true; // Control key
    e.which = key.charCodeAt(0); // I, U, B, 5
    inner$('#innerdocbody').trigger(e);
    await helper.waitForPromise(() => helper.padInner$('body').html() !== originalHTML);
  };

  STYLES.forEach((style) => {
    context(`when selection is in a text with ${style} applied`, function () {
      before(function (done) {
        this.timeout(4000);
        applyStyleOnLineAndSelectIt(FIRST_LINE, style, done);
      });

      after(async function () {
        await undo();
      });

      testIfFormattingButtonIsSelected(style);
    });

    context(`when caret is in a position with ${style} applied`, function () {
      before(function (done) {
        this.timeout(4000);
        applyStyleOnLineAndPlaceCaretOnit(FIRST_LINE, style, done);
      });

      after(async function () {
        await undo();
      });

      testIfFormattingButtonIsSelected(style);
    });
  });

  context('when user applies a style and the selection does not change', function () {
    it('selects the style button', async function () {
      this.timeout(100);
      const style = STYLES[0]; // italic
      applyStyleOnLine(style, FIRST_LINE);
      await helper.waitForPromise(() => isButtonSelected(style) === true);
      applyStyleOnLine(style, FIRST_LINE);
    });
  });

  SHORTCUT_KEYS.forEach((key, index) => {
    const styleOfTheShortcut = STYLES[index]; // italic, bold, ...
    context(`when user presses CMD + ${key}`, function () {
      before(async function () {
        await pressFormattingShortcutOnSelection(key);
      });

      testIfFormattingButtonIsSelected(styleOfTheShortcut);

      context(`and user presses CMD + ${key} again`, function () {
        before(async function () {
          await pressFormattingShortcutOnSelection(key);
        });

        testIfFormattingButtonIsDeselected(styleOfTheShortcut);
      });
    });
  });
});
