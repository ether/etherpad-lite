describe("select formatting buttons when selection has style applied", function(){
  var STYLES = ['italic', 'bold', 'underline', 'strikethrough'];
  var SHORTCUT_KEYS = ['I', 'B', 'U', '5']; // italic, bold, underline, strikethrough
  var FIRST_LINE = 0;

  before(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  var applyStyleOnLine = function(style, line) {
    var chrome$ = helper.padChrome$;
    selectLine(line);
    var $formattingButton = chrome$('.buttonicon-' + style);
    $formattingButton.click();
  }

  var isButtonSelected = function(style) {
    var chrome$ = helper.padChrome$;
    var $formattingButton = chrome$('.buttonicon-' + style);
   return $formattingButton.parent().hasClass('selected');
  }

  var selectLine = function(lineNumber, offsetStart, offsetEnd) {
    var inner$ = helper.padInner$;
    var $line = inner$("div").eq(lineNumber);
    helper.selectLines($line, $line, offsetStart, offsetEnd);
  }

  var placeCaretOnLine = function(lineNumber) {
    var inner$ = helper.padInner$;
    var $line = inner$("div").eq(lineNumber);
    $line.sendkeys('{leftarrow}');
  }

  var undo = function() {
    var $undoButton = helper.padChrome$(".buttonicon-undo");
    $undoButton.click();
  }

  var testIfFormattingButtonIsDeselected = function(style) {
    it('deselects the ' + style + ' button', function(done) {
      helper.waitFor(function(){
        return isButtonSelected(style) === false;
      }).done(done)
    });
  }

  var testIfFormattingButtonIsSelected = function(style) {
    it('selects the ' + style + ' button', function(done) {
      helper.waitFor(function(){
        return isButtonSelected(style);
      }).done(done)
    });
  }

  var applyStyleOnLineAndSelectIt = function(line, style, cb) {
    applyStyleOnLineOnFullLineAndRemoveSelection(line, style, selectLine, cb);
  }

  var applyStyleOnLineAndPlaceCaretOnit = function(line, style, cb) {
    applyStyleOnLineOnFullLineAndRemoveSelection(line, style, placeCaretOnLine, cb);
  }

  var applyStyleOnLineOnFullLineAndRemoveSelection = function(line, style, selectTarget, cb) {
    applyStyleOnLine(style, line);

    // we have to give some time to Etherpad detects the selection changed
    setTimeout(function() {
      // remove selection from previous line
      selectLine(line + 1);
      setTimeout(function() {
        // select the text or place the caret on a position that
        // has the formatting text applied previously
        selectTarget(line);
        cb();
      }, 1000);
    }, 1000);
  }

  var pressFormattingShortcutOnSelection = function(key) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //get the first text element out of the inner iframe
    var $firstTextElement = inner$("div").first();

    //select this text element
    $firstTextElement.sendkeys('{selectall}');

    var e = inner$.Event(helper.evtType);
    e.ctrlKey = true; // Control key
    e.which = key.charCodeAt(0); // I, U, B, 5
    inner$("#innerdocbody").trigger(e);
  }

  STYLES.forEach(function(style){
    context('when selection is in a text with ' + style + ' applied', function(){
      before(function (done) {
        this.timeout(4000);
        applyStyleOnLineAndSelectIt(FIRST_LINE, style, done);
      });

      after(function () {
        undo();
      });

      testIfFormattingButtonIsSelected(style);
    });

    context('when caret is in a position with ' + style + ' applied', function(){
      before(function (done) {
        this.timeout(4000);
        applyStyleOnLineAndPlaceCaretOnit(FIRST_LINE, style, done);
      });

      after(function () {
        undo();
      });

      testIfFormattingButtonIsSelected(style)
    });
  });

  context('when user applies a style and the selection does not change', function() {
    var style = STYLES[0]; // italic
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

  SHORTCUT_KEYS.forEach(function(key, index){
    var styleOfTheShortcut = STYLES[index]; // italic, bold, ...
    context('when user presses CMD + ' + key, function() {
      before(function () {
        pressFormattingShortcutOnSelection(key);
      });

      testIfFormattingButtonIsSelected(styleOfTheShortcut);

      context('and user presses CMD + ' + key + ' again', function() {
        before(function () {
          pressFormattingShortcutOnSelection(key);
        });

        testIfFormattingButtonIsDeselected(styleOfTheShortcut);
      });
    });
  });
});
