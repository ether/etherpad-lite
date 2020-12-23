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

  var selectLine = function (lineNumber, offsetStart, offsetEnd) {
    const inner$ = helper.padInner$;
    const $line = inner$('div').eq(lineNumber);
    helper.selectLines($line, $line, offsetStart, offsetEnd);
  };

  const placeCaretOnLine = function (lineNumber) {
    const inner$ = helper.padInner$;
    const $line = inner$('div').eq(lineNumber);
    $line.sendkeys('{leftarrow}');
  };

  const undo = function () {
    const $undoButton = helper.padChrome$('.buttonicon-undo');
    $undoButton.click();
  };

  const testIfFormattingButtonIsDeselected = function (style) {
    it(`deselects the ${style} button`, function (done) {
      helper.waitFor(() => isButtonSelected(style) === false).done(done);
    });
  };

  const testIfFormattingButtonIsSelected = function (style) {
    it(`selects the ${style} button`, function (done) {
      helper.waitFor(() => isButtonSelected(style)).done(done);
    });
  };

  const applyStyleOnLineAndSelectIt = function (line, style, cb) {
    applyStyleOnLineOnFullLineAndRemoveSelection(line, style, selectLine, cb);
  };

  const applyStyleOnLineAndPlaceCaretOnit = function (line, style, cb) {
    applyStyleOnLineOnFullLineAndRemoveSelection(line, style, placeCaretOnLine, cb);
  };

  var applyStyleOnLineOnFullLineAndRemoveSelection = function (line, style, selectTarget, cb) {
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

  const pressFormattingShortcutOnSelection = function (key) {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // select this text element
    $firstTextElement.sendkeys('{selectall}');

    const e = inner$.Event(helper.evtType);
    e.ctrlKey = true; // Control key
    e.which = key.charCodeAt(0); // I, U, B, 5
    inner$('#innerdocbody').trigger(e);
  };

  STYLES.forEach((style) => {
    context(`when selection is in a text with ${style} applied`, function () {
      before(function (done) {
        this.timeout(4000);
        applyStyleOnLineAndSelectIt(FIRST_LINE, style, done);
      });

      after(function () {
        undo();
      });

      testIfFormattingButtonIsSelected(style);
    });

    context(`when caret is in a position with ${style} applied`, function () {
      before(function (done) {
        this.timeout(4000);
        applyStyleOnLineAndPlaceCaretOnit(FIRST_LINE, style, done);
      });

      after(function () {
        undo();
      });

      testIfFormattingButtonIsSelected(style);
    });
  });

  context('when user applies a style and the selection does not change', function () {
    const style = STYLES[0]; // italic
    before(function () {
      applyStyleOnLine(style, FIRST_LINE);
    });

    // clean the style applied
    after(function () {
      applyStyleOnLine(style, FIRST_LINE);
    });

    it('selects the style button', function (done) {
      expect(isButtonSelected(style)).to.be(true);
      done();
    });
  });

  SHORTCUT_KEYS.forEach((key, index) => {
    const styleOfTheShortcut = STYLES[index]; // italic, bold, ...
    context(`when user presses CMD + ${key}`, function () {
      before(function () {
        pressFormattingShortcutOnSelection(key);
      });

      testIfFormattingButtonIsSelected(styleOfTheShortcut);

      context(`and user presses CMD + ${key} again`, function () {
        before(function () {
          pressFormattingShortcutOnSelection(key);
        });

        testIfFormattingButtonIsDeselected(styleOfTheShortcut);
      });
    });
  });
});
