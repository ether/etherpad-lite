describe('scroll when focus line is out of viewport', function () {
  before(function (done) {
    helper.newPad(function(){
      cleanPad(function(){
        forceUseMonospacedFont();
        scrollWhenPlaceCaretInTheLastLineOfViewport();
        createPadWithSeveralLines(function(){
          resizeEditorHeight();
          done();
        });
      });
    });
    this.timeout(20000);
  });

  context('when user presses any arrow keys on a line above the viewport', function(){
    context('and scroll percentage config is set to 0.2 on settings.json', function(){
      var lineCloseOfTopOfPad = 10;
      before(function (done) {
        setScrollPercentageWhenFocusLineIsOutOfViewport(0.2, true);
        scrollEditorToBottomOfPad();

        placeCaretInTheBeginningOfLine(lineCloseOfTopOfPad, function(){ // place caret in the 10th line
          // warning: even pressing right arrow, the caret does not change of position
          // the column where the caret is, it has not importance, only the line
          pressAndReleaseRightArrow();
          done();
        });
      });

      it('keeps the focus line scrolled 20% from the top of the viewport', function (done) {
        // default behavior is to put the line in the top of viewport, but as
        // scrollPercentageWhenFocusLineIsOutOfViewport is set to 0.2, we have an extra 20% of lines scrolled
        // (2 lines, which are the 20% of the 10 that are visible on viewport)
        var firstLineOfViewport = getFirstLineVisibileOfViewport();
        expect(lineCloseOfTopOfPad).to.be(firstLineOfViewport + 2);
        done();
      });
    });
  });

  context('when user presses any arrow keys on a line below the viewport', function(){
    context('and scroll percentage config is set to 0.7 on settings.json', function(){
      var lineCloseToBottomOfPad = 50;
      before(function (done) {
        setScrollPercentageWhenFocusLineIsOutOfViewport(0.7);

        // firstly, scroll to make the lineCloseToBottomOfPad visible. After that, scroll to make it out of viewport
        scrollEditorToTopOfPad();
        placeCaretAtTheEndOfLine(lineCloseToBottomOfPad); // place caret in the 50th line
        setTimeout(function() {
          // warning: even pressing right arrow, the caret does not change of position
          pressAndReleaseLeftArrow();
          done();
        }, 1000);
      });

      it('keeps the focus line scrolled 70% from the bottom of the viewport', function (done) {
        // default behavior is to put the line in the top of viewport, but as
        // scrollPercentageWhenFocusLineIsOutOfViewport is set to 0.7, we have an extra 70% of lines scrolled
        // (7 lines, which are the 70% of the 10 that are visible on viewport)
        var lastLineOfViewport = getLastLineVisibleOfViewport();
        expect(lineCloseToBottomOfPad).to.be(lastLineOfViewport - 7);
        done();
      });
    });
  });

  context('when user presses arrow up on the first line of the viewport', function(){
    context('and percentageToScrollWhenUserPressesArrowUp is set to 0.3', function () {
      var lineOnTopOfViewportWhenThePadIsScrolledDown;
      before(function (done) {
        setPercentageToScrollWhenUserPressesArrowUp(0.3);

        // we need some room to make the scroll up
        scrollEditorToBottomOfPad();
        lineOnTopOfViewportWhenThePadIsScrolledDown = 91;
        placeCaretAtTheEndOfLine(lineOnTopOfViewportWhenThePadIsScrolledDown);
        setTimeout(function() {
          // warning: even pressing up arrow, the caret does not change of position
          pressAndReleaseUpArrow();
          done();
        }, 1000);
      });

      it('keeps the focus line scrolled 30% of the top of the viewport', function (done) {
        // default behavior is to put the line in the top of viewport, but as
        // PercentageToScrollWhenUserPressesArrowUp is set to 0.3, we have an extra 30% of lines scrolled
        // (3 lines, which are the 30% of the 10 that are visible on viewport)
        var firstLineOfViewport = getFirstLineVisibileOfViewport();
        expect(firstLineOfViewport).to.be(lineOnTopOfViewportWhenThePadIsScrolledDown - 3);
        done();
      })
    });
  });

  context('when user edits the last line of viewport', function(){
    context('and scroll percentage config is set to 0 on settings.json', function(){
      var lastLineOfViewportBeforeEnter = 10;
      before(function () {
        // the default value
        resetScrollPercentageWhenFocusLineIsOutOfViewport();

        // make sure the last line on viewport is the 10th one
        scrollEditorToTopOfPad();
        placeCaretAtTheEndOfLine(lastLineOfViewportBeforeEnter);
        pressEnter();
      });

      it('keeps the focus line on the bottom of the viewport', function (done) {
        var lastLineOfViewportAfterEnter = getLastLineVisibleOfViewport();
        expect(lastLineOfViewportAfterEnter).to.be(lastLineOfViewportBeforeEnter + 1);
        done();
      });
    });

    context('and scrollPercentageWhenFocusLineIsOutOfViewport is set to 0.3', function(){ // this value is arbitrary
      var lastLineOfViewportBeforeEnter = 9;
      before(function () {
        setScrollPercentageWhenFocusLineIsOutOfViewport(0.3);

        // make sure the last line on viewport is the 10th one
        scrollEditorToTopOfPad();
        placeCaretAtTheEndOfLine(lastLineOfViewportBeforeEnter);
        pressBackspace();
      });

      it('scrolls 30% of viewport up', function (done) {
        var lastLineOfViewportAfterEnter = getLastLineVisibleOfViewport();
        // default behavior is to scroll one line at the bottom of viewport, but as
        // scrollPercentageWhenFocusLineIsOutOfViewport is set to 0.3, we have an extra 30% of lines scrolled
        // (3 lines, which are the 30% of the 10 that are visible on viewport)
        expect(lastLineOfViewportAfterEnter).to.be(lastLineOfViewportBeforeEnter + 3);
        done();
      });
    });

    context('and it is set to a value that overflow the interval [0, 1]', function(){
      var lastLineOfViewportBeforeEnter = 10;
      before(function(){
        var scrollPercentageWhenFocusLineIsOutOfViewport = 1.5;
        scrollEditorToTopOfPad();
        placeCaretAtTheEndOfLine(lastLineOfViewportBeforeEnter);
        setScrollPercentageWhenFocusLineIsOutOfViewport(scrollPercentageWhenFocusLineIsOutOfViewport);
        pressEnter();
      });

      it('keeps the default behavior of moving the focus line on the bottom of the viewport', function (done) {
        var lastLineOfViewportAfterEnter = getLastLineVisibleOfViewport();
        expect(lastLineOfViewportAfterEnter).to.be(lastLineOfViewportBeforeEnter + 1);
        done();
      });
    });
  });

  context('when user edits a line above the viewport', function(){
    context('and scroll percentage config is set to 0 on settings.json', function(){
      var lineCloseOfTopOfPad = 10;
      before(function () {
        // the default value
        setScrollPercentageWhenFocusLineIsOutOfViewport(0);

        // firstly, scroll to make the lineCloseOfTopOfPad visible. After that, scroll to make it out of viewport
        scrollEditorToTopOfPad();
        placeCaretAtTheEndOfLine(lineCloseOfTopOfPad); // place caret in the 10th line
        scrollEditorToBottomOfPad();
        pressBackspace(); // edit the line where the caret is, which is above the viewport
      });

      it('keeps the focus line on the top of the viewport', function (done) {
        var firstLineOfViewportAfterEnter = getFirstLineVisibileOfViewport();
        expect(firstLineOfViewportAfterEnter).to.be(lineCloseOfTopOfPad);
        done();
      });
    });

    context('and scrollPercentageWhenFocusLineIsOutOfViewport is set to 0.2', function(){ // this value is arbitrary
      var lineCloseToBottomOfPad = 50;
      before(function () {
        // we force the line edited to be above the top of the viewport
        setScrollPercentageWhenFocusLineIsOutOfViewport(0.2, true); // set scroll jump to 20%
        scrollEditorToTopOfPad();
        placeCaretAtTheEndOfLine(lineCloseToBottomOfPad);
        scrollEditorToBottomOfPad();
        pressBackspace(); // edit line
      });

      it('scrolls 20% of viewport down', function (done) {
        // default behavior is to scroll one line at the top of viewport, but as
        // scrollPercentageWhenFocusLineIsOutOfViewport is set to 0.2, we have an extra 20% of lines scrolled
        // (2 lines, which are the 20% of the 10 that are visible on viewport)
        var firstLineVisibileOfViewport = getFirstLineVisibileOfViewport();
        expect(lineCloseToBottomOfPad).to.be(firstLineVisibileOfViewport + 2);
        done();
      });
    });
  });

  context('when user places the caret at the last line visible of viewport', function(){
    var lastLineVisible;
    context('and scroll percentage config is set to 0 on settings.json', function(){
      before(function (done) {
        // reset to the default value
        resetScrollPercentageWhenFocusLineIsOutOfViewport();

        placeCaretInTheBeginningOfLine(0, function(){ // reset caret position
          scrollEditorToTopOfPad();
          lastLineVisible = getLastLineVisibleOfViewport();
          placeCaretInTheBeginningOfLine(lastLineVisible, done); // place caret in the 9th line
        });

      });

      it('does not scroll', function(done){
        setTimeout(function() {
          var lastLineOfViewport = getLastLineVisibleOfViewport();
          var lineDoesNotScroll = lastLineOfViewport === lastLineVisible;
          expect(lineDoesNotScroll).to.be(true);
          done();
        }, 1000);
      });
    });
    context('and scroll percentage config is set to 0.5 on settings.json', function(){
      before(function (done) {
        setScrollPercentageWhenFocusLineIsOutOfViewport(0.5);
        scrollEditorToTopOfPad();
        placeCaretInTheBeginningOfLine(0, function(){ // reset caret position
          // this timeout inside a callback is ugly but it necessary to give time to aceSelectionChange
          // realizes that the selection has been changed
          setTimeout(function() {
            lastLineVisible = getLastLineVisibleOfViewport();
            placeCaretInTheBeginningOfLine(lastLineVisible, done); // place caret in the 9th line
          }, 1000);
        });
      });

      it('scrolls line to 50% of the viewport', function(done){
        helper.waitFor(function(){
          var lastLineOfViewport = getLastLineVisibleOfViewport();
          var lastLinesScrolledFiveLinesUp = lastLineOfViewport - 5 === lastLineVisible;
          return lastLinesScrolledFiveLinesUp;
        }).done(done);
      });
    });
  });

  // This is a special case. When user is selecting a text with arrow down or arrow left we have
  // to keep the last line selected on focus
  context('when the first line selected is out of the viewport and user presses shift arrow down', function(){
    var lastLineOfPad = 99;
    before(function (done) {
      scrollEditorToTopOfPad();

      // make a selection bigger than the viewport height
      var $firstLineOfSelection = getLine(0);
      var $lastLineOfSelection = getLine(lastLineOfPad);
      var lengthOfLastLine = $lastLineOfSelection.text().length;
      helper.selectLines($firstLineOfSelection, $lastLineOfSelection, 0, lengthOfLastLine);

      // place the last line selected on the viewport
      scrollEditorToBottomOfPad();

      // press a key to make the selection goes down
      // although we can't simulate the extending of selection. It's possible to send a key event
      // which is captured on ace2_inner scroll function.
      pressAndReleaseLeftArrow(true);
      done();
    });

    it('keeps the last line selected on focus', function (done) {
      var lastLineOfSelectionIsVisible = isLineOnViewport(lastLineOfPad);
      expect(lastLineOfSelectionIsVisible).to.be(true);
      done();
    });
  });

  // In this scenario we avoid the bouncing scroll. E.g Let's suppose we have a big line that is
  // the size of the viewport, and its top is above the viewport. When user presses '<-', this line
  // will scroll down because the top is out of the viewport. When it scrolls down, the bottom of
  // line gets below the viewport so when user presses '<-' again it scrolls up to make the bottom
  // of line visible. If user presses arrow keys more than one time, the editor will keep scrolling up and down
  context('when the line height is bigger than the scroll amount percentage * viewport height', function(){
    var scrollOfEditorBeforePressKey;
    var BIG_LINE_NUMBER = 0;
    var MIDDLE_OF_BIG_LINE = 51;
    before(function (done) {
      createPadWithALineHigherThanViewportHeight(this, BIG_LINE_NUMBER, function(){
        setScrollPercentageWhenFocusLineIsOutOfViewport(0.5); // set any value to force scroll to outside to viewport
        var $bigLine = getLine(BIG_LINE_NUMBER);

        // each line has about 5 chars, we place the caret in the middle of the line
        helper.selectLines($bigLine, $bigLine, MIDDLE_OF_BIG_LINE, MIDDLE_OF_BIG_LINE);

        scrollEditorToLeaveTopAndBottomOfBigLineOutOfViewport($bigLine);
        scrollOfEditorBeforePressKey = getEditorScroll();

        // press a key to force to scroll
        pressAndReleaseRightArrow();
        done();
      });
    });

    // reset pad to the original text
    after(function (done) {
      this.timeout(5000);
      cleanPad(function(){
        createPadWithSeveralLines(function(){
          resetEditorWidth();
          done();
        });
      });
    });

    // as the editor.line is inside of the viewport, it should not scroll
    it('should not scroll', function (done) {
      var scrollOfEditorAfterPressKey = getEditorScroll();
      expect(scrollOfEditorAfterPressKey).to.be(scrollOfEditorBeforePressKey);
      done();
    });
  });

  // Some plugins, for example the ep_page_view, change the editor dimensions. This plugin, for example,
  // adds padding-top to the ace_outer, which changes the viewport height
  describe('integration with plugins which changes the margin of editor', function(){
    context('when editor dimensions changes', function(){
      before(function () {
        // reset the size of editor. Now we show more than 10 lines as in the other tests
        resetResizeOfEditorHeight();
        scrollEditorToTopOfPad();

        // height of the editor viewport
        var editorHeight = getEditorHeight();

        // add a big padding-top, 50% of the viewport
        var paddingTopOfAceOuter = editorHeight/2;
        var chrome$ = helper.padChrome$;
        var $outerIframe = chrome$('iframe');
        $outerIframe.css('padding-top', paddingTopOfAceOuter);

        // we set a big value to check if the scroll is made
        setScrollPercentageWhenFocusLineIsOutOfViewport(1);
      });

      context('and user places the caret in the last line visible of the pad', function(){
        var lastLineVisible;
        beforeEach(function (done) {
          lastLineVisible = getLastLineVisibleOfViewport();
          placeCaretInTheBeginningOfLine(lastLineVisible, done);
        });

        it('scrolls the line where caret is', function(done){
          helper.waitFor(function(){
            var firstLineVisibileOfViewport = getFirstLineVisibileOfViewport();
            var linesScrolled = firstLineVisibileOfViewport !== 0;
            return linesScrolled;
          }).done(done);
        });
      });
    });
  });

  /* ********************* Helper functions/constants ********************* */
  var TOP_OF_PAGE = 0;
  var BOTTOM_OF_PAGE = 5000; // we use a big value to force the page to be scrolled all the way down
  var LINES_OF_PAD = 100;
  var ENTER = 13;
  var BACKSPACE = 8;
  var LEFT_ARROW = 37;
  var UP_ARROW = 38;
  var RIGHT_ARROW = 39;
  var LINES_ON_VIEWPORT = 10;
  var WIDTH_OF_EDITOR_RESIZED = 100;
  var LONG_TEXT_CHARS = 100;

  var cleanPad = function(callback) {
    var inner$ = helper.padInner$;
    var $padContent = inner$('#innerdocbody');
    $padContent.html('');

    // wait for Etherpad to re-create first line
    helper.waitFor(function(){
      var lineNumber = inner$('div').length;
      return lineNumber === 1;
    }, 2000).done(callback);
  };

  var createPadWithSeveralLines = function(done) {
    var line = '<span>a</span><br>';
    var $firstLine = helper.padInner$('div').first();
    var lines = line.repeat(LINES_OF_PAD); //arbitrary number, we need to create lines that is over the viewport
    $firstLine.html(lines);

    helper.waitFor(function(){
      var linesCreated = helper.padInner$('div').length;
      return linesCreated === LINES_OF_PAD;
    }, 4000).done(done);
  };

  var createPadWithALineHigherThanViewportHeight = function(test, line, done) {
    var viewportHeight = 160; //10 lines * 16px (height of line)
    test.timeout(5000);
    cleanPad(function(){
      // make the editor smaller to make test easier
      // with that width the each line has about 5 chars
      resizeEditorWidth();

      // we create a line with 100 chars, which makes about 20 lines
      setLongTextOnLine(line);
      helper.waitFor(function () {
        var $firstLine = getLine(line);

        var heightOfLine = $firstLine.get(0).getBoundingClientRect().height;
        return heightOfLine >= viewportHeight;
      }, 4000).done(done);
    });
  };

  var setLongTextOnLine = function(line) {
    var $line = getLine(line);
    var longText = 'a'.repeat(LONG_TEXT_CHARS);
    $line.html(longText);
  };

  // resize the editor to make the tests easier
  var resizeEditorHeight = function() {
    var chrome$ = helper.padChrome$;
    chrome$('#editorcontainer').css('height', getSizeOfViewport());
  };

  // this makes about 5 chars per line
  var resizeEditorWidth = function() {
    var chrome$ = helper.padChrome$;
    chrome$('#editorcontainer').css('width', WIDTH_OF_EDITOR_RESIZED);
  };

  var resetResizeOfEditorHeight = function() {
    var chrome$ = helper.padChrome$;
    chrome$('#editorcontainer').css('height', '');
  };

  var resetEditorWidth = function () {
    var chrome$ = helper.padChrome$;
    chrome$('#editorcontainer').css('width', '');
  };

  var getEditorHeight = function() {
    var chrome$ = helper.padChrome$;
    var $editor = chrome$('#editorcontainer');
    var editorHeight = $editor.get(0).clientHeight;
    return editorHeight;
  };

  var getSizeOfViewport = function() {
    return getLinePositionOnViewport(LINES_ON_VIEWPORT) - getLinePositionOnViewport(0);
  };

  var scrollPageTo = function(value) {
    var outer$ = helper.padOuter$;
    var $ace_outer = outer$('#outerdocbody').parent();
    $ace_outer.parent().scrollTop(value);
  };

  var scrollEditorToTopOfPad = function() {
    scrollPageTo(TOP_OF_PAGE);
  };

  var scrollEditorToBottomOfPad = function() {
    scrollPageTo(BOTTOM_OF_PAGE);
  };

  var scrollEditorToLeaveTopAndBottomOfBigLineOutOfViewport = function ($bigLine) {
    var lineHeight = $bigLine.get(0).getBoundingClientRect().height;
    var middleOfLine = lineHeight/2;
    scrollPageTo(middleOfLine);
  };

  var getLine = function(lineNum) {
    var inner$ = helper.padInner$;
    var $line = inner$('div').eq(lineNum);
    return $line;
  };

  var placeCaretAtTheEndOfLine = function(lineNum) {
    var $targetLine = getLine(lineNum);
    var lineLength = $targetLine.text().length;
    helper.selectLines($targetLine, $targetLine, lineLength, lineLength);
  };

  var placeCaretInTheBeginningOfLine = function(lineNum, cb) {
    var $targetLine = getLine(lineNum);
    helper.selectLines($targetLine, $targetLine, 0, 0);
    helper.waitFor(function() {
      var $lineWhereCaretIs = getLineWhereCaretIs();
      return $targetLine.get(0) === $lineWhereCaretIs.get(0);
    }).done(cb);
  };

  var getLineWhereCaretIs = function() {
    var inner$ = helper.padInner$;
    var nodeWhereCaretIs = inner$.document.getSelection().anchorNode;
    var $lineWhereCaretIs = $(nodeWhereCaretIs).closest('div');
    return $lineWhereCaretIs;
  };

  var getFirstLineVisibileOfViewport = function() {
    return _.find(_.range(0, LINES_OF_PAD - 1), isLineOnViewport);
  };

  var getLastLineVisibleOfViewport = function() {
    return _.find(_.range(LINES_OF_PAD - 1, 0, -1), isLineOnViewport);
  };

  var pressKey = function(keyCode, shiftIsPressed){
    var inner$ = helper.padInner$;
    var evtType;
    if(inner$(window)[0].bowser.modernIE){ // if it's IE
      evtType = 'keypress';
    }else{
      evtType = 'keydown';
    }
    var e = inner$.Event(evtType);
    e.shiftKey = shiftIsPressed;
    e.keyCode = keyCode;
    e.which = keyCode; // etherpad listens to 'which'
    inner$('#innerdocbody').trigger(e);
  };

  var releaseKey = function(keyCode){
    var inner$ = helper.padInner$;
    var evtType = 'keyup';
    var e = inner$.Event(evtType);
    e.keyCode = keyCode;
    e.which = keyCode; // etherpad listens to 'which'
    inner$('#innerdocbody').trigger(e);
  };

  var pressEnter = function() {
    pressKey(ENTER);
  };

  var pressBackspace = function() {
    pressKey(BACKSPACE);
  };

  var pressAndReleaseUpArrow = function() {
    pressKey(UP_ARROW);
    releaseKey(UP_ARROW);
  };

  var pressAndReleaseRightArrow = function() {
    pressKey(RIGHT_ARROW);
    releaseKey(RIGHT_ARROW);
  };

  var pressAndReleaseLeftArrow = function(shiftIsPressed) {
    pressKey(LEFT_ARROW, shiftIsPressed);
    releaseKey(LEFT_ARROW);
  };

  var isLineOnViewport = function(lineNumber) {
    // in the function scrollNodeVerticallyIntoView from ace2_inner.js, iframePadTop is used to calculate
    // how much scroll is needed. Although the name refers to padding-top, this value is not set on the
    // padding-top.
    var iframePadTop = 8;
    var $line = getLine(lineNumber);
    var linePosition = $line.get(0).getBoundingClientRect();

    // position relative to the current viewport
    var linePositionTopOnViewport = linePosition.top - getEditorScroll() + iframePadTop;
    var linePositionBottomOnViewport = linePosition.bottom - getEditorScroll();

    var lineBellowTop = linePositionBottomOnViewport > 0;
    var lineAboveBottom = linePositionTopOnViewport < getClientHeightVisible();
    var isVisible = lineBellowTop && lineAboveBottom;

    return isVisible;
  };

  var getEditorScroll = function () {
    var outer$ = helper.padOuter$;
    var scrollTopFirefox = outer$('#outerdocbody').parent().scrollTop(); // works only on firefox
    var scrollTop = outer$('#outerdocbody').scrollTop() || scrollTopFirefox;
    return scrollTop;
  };

  // clientHeight includes padding, so we have to subtract it and consider only the visible viewport
  var getClientHeightVisible = function () {
    var outer$ = helper.padOuter$;
    var $ace_outer = outer$('#outerdocbody').parent();
    var ace_outerHeight = $ace_outer.get(0).clientHeight;
    var ace_outerPaddingTop = getIntValueOfCSSProperty($ace_outer, 'padding-top');
    var paddingAddedWhenPageViewIsEnable = getPaddingAddedWhenPageViewIsEnable();
    var clientHeight = ace_outerHeight - ( ace_outerPaddingTop + paddingAddedWhenPageViewIsEnable);

    return clientHeight;
  };

  // ep_page_view changes the dimensions of the editor. We have to guarantee
  // the viewport height is calculated right
  var getPaddingAddedWhenPageViewIsEnable = function () {
    var chrome$ = helper.padChrome$;
    var $outerIframe = chrome$('iframe');
    var paddingAddedWhenPageViewIsEnable = parseInt($outerIframe.css('padding-top'));
    return paddingAddedWhenPageViewIsEnable;
  };

  var getIntValueOfCSSProperty = function($element, property){
    var valueString = $element.css(property);
    return parseInt(valueString) || 0;
  };

  var forceUseMonospacedFont = function () {
    helper.padChrome$.window.clientVars.padOptions.useMonospaceFont = true;
  };

  var setScrollPercentageWhenFocusLineIsOutOfViewport = function(value, editionAboveViewport) {
    var scrollSettings = helper.padChrome$.window.clientVars.scrollWhenFocusLineIsOutOfViewport;
    if (editionAboveViewport) {
      scrollSettings.percentage.editionAboveViewport = value;
    }else{
      scrollSettings.percentage.editionBelowViewport = value;
    }
  };

  var resetScrollPercentageWhenFocusLineIsOutOfViewport = function() {
    var scrollSettings = helper.padChrome$.window.clientVars.scrollWhenFocusLineIsOutOfViewport;
    scrollSettings.percentage.editionAboveViewport = 0;
    scrollSettings.percentage.editionBelowViewport = 0;
  };

  var setPercentageToScrollWhenUserPressesArrowUp = function (value) {
    var scrollSettings = helper.padChrome$.window.clientVars.scrollWhenFocusLineIsOutOfViewport;
    scrollSettings.percentageToScrollWhenUserPressesArrowUp = value;
  };

  var scrollWhenPlaceCaretInTheLastLineOfViewport = function() {
    var scrollSettings = helper.padChrome$.window.clientVars.scrollWhenFocusLineIsOutOfViewport;
    scrollSettings.scrollWhenCaretIsInTheLastLineOfViewport = true;
  };

  var getLinePositionOnViewport = function(lineNumber) {
    var $line = getLine(lineNumber);
    var linePosition = $line.get(0).getBoundingClientRect();

    // position relative to the current viewport
    return linePosition.top - getEditorScroll();
  };
});

