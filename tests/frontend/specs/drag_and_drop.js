// WARNING: drag and drop is only simulated on these tests, so manual testing might also be necessary
describe('drag and drop', function() {
  before(function(done) {
    helper.newPad(function() {
      createScriptWithSeveralLines(done);
    });
    this.timeout(60000);
  });

  context('when user drags part of one line and drops it far form its original place', function() {
    before(function(done) {
      selectPartOfSourceLine();
      dragSelectedTextAndDropItIntoMiddleOfLine(TARGET_LINE);

      // make sure DnD was correctly simulated
      helper.waitFor(function() {
        var $targetLine = getLine(TARGET_LINE);
        var sourceWasMovedToTarget = $targetLine.text() === 'Target line [line 1]';
        return sourceWasMovedToTarget;
      }).done(done);
    });

    context('and user triggers UNDO', function() {
      before(function() {
        var $undoButton = helper.padChrome$(".buttonicon-undo");
        $undoButton.click();
      });

      it('moves text back to its original place', function(done) {
        // test text was removed from drop target
        var $targetLine = getLine(TARGET_LINE);
        expect($targetLine.text()).to.be('Target line []');

        // test text was added back to original place
        var $firstSourceLine = getLine(FIRST_SOURCE_LINE);
        var $lastSourceLine  = getLine(FIRST_SOURCE_LINE + 1);
        expect($firstSourceLine.text()).to.be('Source line 1.');
        expect($lastSourceLine.text()).to.be('Source line 2.');

        done();
      });
    });
  });

  context('when user drags some lines far form its original place', function() {
    before(function(done) {
      selectMultipleSourceLines();
      dragSelectedTextAndDropItIntoMiddleOfLine(TARGET_LINE);

      // make sure DnD was correctly simulated
      helper.waitFor(function() {
        var $lineAfterTarget = getLine(TARGET_LINE + 1);
        var sourceWasMovedToTarget = $lineAfterTarget.text() !== '...';
        return sourceWasMovedToTarget;
      }).done(done);
    });

    context('and user triggers UNDO', function() {
      before(function() {
        var $undoButton = helper.padChrome$(".buttonicon-undo");
        $undoButton.click();
      });

      it('moves text back to its original place', function(done) {
        // test text was removed from drop target
        var $targetLine = getLine(TARGET_LINE);
        expect($targetLine.text()).to.be('Target line []');

        // test text was added back to original place
        var $firstSourceLine = getLine(FIRST_SOURCE_LINE);
        var $lastSourceLine  = getLine(FIRST_SOURCE_LINE + 1);
        expect($firstSourceLine.text()).to.be('Source line 1.');
        expect($lastSourceLine.text()).to.be('Source line 2.');

        done();
      });
    });
  });

  /* ********************* Helper functions/constants ********************* */
  var TARGET_LINE = 2;
  var FIRST_SOURCE_LINE = 5;

  var getLine = function(lineNumber) {
    var $lines = helper.padInner$('div');
    return $lines.slice(lineNumber, lineNumber + 1);
  }

  var createScriptWithSeveralLines = function(done) {
    // create some lines to be used on the tests
    var $firstLine = helper.padInner$('div').first();
    $firstLine.html('...<br>...<br>Target line []<br>...<br>...<br>Source line 1.<br>Source line 2.<br>');

    // wait for lines to be split
    helper.waitFor(function(){
      var $lastSourceLine = getLine(FIRST_SOURCE_LINE + 1);
      return $lastSourceLine.text() === 'Source line 2.';
    }).done(done);
  }

  var selectPartOfSourceLine = function() {
    var $sourceLine = getLine(FIRST_SOURCE_LINE);

    // select 'line 1' from 'Source line 1.'
    var start = 'Source '.length;
    var end = start + 'line 1'.length;
    helper.selectLines($sourceLine, $sourceLine, start, end);
  }
  var selectMultipleSourceLines = function() {
    var $firstSourceLine = getLine(FIRST_SOURCE_LINE);
    var $lastSourceLine  = getLine(FIRST_SOURCE_LINE + 1);

    helper.selectLines($firstSourceLine, $lastSourceLine);
  }

  var dragSelectedTextAndDropItIntoMiddleOfLine = function(targetLineNumber) {
    // dragstart: start dragging content
    triggerEvent('dragstart');

    // drop: get HTML data from selected text
    var draggedHtml = getHtmlFromSelectedText();
    triggerEvent('drop');

    // dragend: remove original content + insert HTML data into target
    moveSelectionIntoTarget(draggedHtml, targetLineNumber);
    triggerEvent('dragend');
  }

  var getHtmlFromSelectedText = function() {
    var innerDocument = helper.padInner$.document;

    var range = innerDocument.getSelection().getRangeAt(0);
    var clonedSelection = range.cloneContents();
    var span = innerDocument.createElement('span');
    span.id = 'buffer';
    span.appendChild(clonedSelection);
    var draggedHtml = span.outerHTML;

    return draggedHtml;
  }

  var triggerEvent = function(eventName) {
    var event = helper.padInner$.Event(eventName);
    helper.padInner$('#innerdocbody').trigger(event);
  }

  var moveSelectionIntoTarget = function(draggedHtml, targetLineNumber) {
    var innerDocument = helper.padInner$.document;

    // delete original content
    innerDocument.execCommand('delete');

    // set position to insert content on target line
    var $target = getLine(targetLineNumber);
    $target.sendkeys('{selectall}{rightarrow}{leftarrow}');

    // Insert content.
    // Based on http://stackoverflow.com/a/6691294, to be IE-compatible
    var range = innerDocument.getSelection().getRangeAt(0);
    var frag  = innerDocument.createDocumentFragment();
    var el    = innerDocument.createElement('div');
    el.innerHTML = draggedHtml;
    while (el.firstChild) {
      frag.appendChild(el.firstChild);
    }
    range.insertNode(frag);
  }
});
