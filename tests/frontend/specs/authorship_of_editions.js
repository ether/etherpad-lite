describe('author of pad edition', function() {
  var REGULAR_LINE = 0;
  var LINE_WITH_ORDERED_LIST = 1;
  var LINE_WITH_UNORDERED_LIST = 2;

  // author 1 creates a new pad with some content (regular lines and lists)
  before(function(done) {
    var padId = helper.newPad(function() {
      // make sure pad has at least 3 lines
      var $firstLine = helper.padInner$('div').first();
      var threeLines = ['regular line', 'line with ordered list', 'line with unordered list'].join('<br>');
      $firstLine.html(threeLines);

      // wait for lines to be processed by Etherpad
      helper.waitFor(function() {
        var $lineWithUnorderedList = getLine(LINE_WITH_UNORDERED_LIST);
        return $lineWithUnorderedList.text() === 'line with unordered list';
      }).done(function() {
        // create the unordered list
        var $lineWithUnorderedList = getLine(LINE_WITH_UNORDERED_LIST);
        $lineWithUnorderedList.sendkeys('{selectall}');

        var $insertUnorderedListButton = helper.padChrome$('.buttonicon-insertunorderedlist');
        $insertUnorderedListButton.click();

        helper.waitFor(function() {
          var $lineWithUnorderedList = getLine(LINE_WITH_UNORDERED_LIST);
          return $lineWithUnorderedList.find('ul li').length === 1;
        }).done(function() {
          // create the ordered list
          var $lineWithOrderedList = getLine(LINE_WITH_ORDERED_LIST);
          $lineWithOrderedList.sendkeys('{selectall}');

          var $insertOrderedListButton = helper.padChrome$('.buttonicon-insertorderedlist');
          $insertOrderedListButton.click();

          helper.waitFor(function() {
            var $lineWithOrderedList = getLine(LINE_WITH_ORDERED_LIST);
            return $lineWithOrderedList.find('ol li').length === 1;
          }).done(function() {
            // Reload pad, to make changes as a second user. Need a timeout here to make sure
            // all changes were saved before reloading
            setTimeout(function() {
              // Expire cookie, so author is changed after reloading the pad.
              // See https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie#Example_4_Reset_the_previous_cookie
              helper.padChrome$.document.cookie = 'token=foo;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

              helper.newPad(done, padId);
            }, 1000);
          });
        });
      });
    });
    this.timeout(60000);
  });

  // author 2 makes some changes on the pad
  it('marks only the new content as changes of the second user on a regular line', function(done) {
    changeLineAndCheckOnlyThatChangeIsFromThisAuthor(REGULAR_LINE, 'x', done);
  });

  it('marks only the new content as changes of the second user on a line with ordered list', function(done) {
    changeLineAndCheckOnlyThatChangeIsFromThisAuthor(LINE_WITH_ORDERED_LIST, 'y', done);
  });

  it('marks only the new content as changes of the second user on a line with unordered list', function(done) {
    changeLineAndCheckOnlyThatChangeIsFromThisAuthor(LINE_WITH_UNORDERED_LIST, 'z', done);
  });

  /* ********************** Helper functions ************************ */
  var getLine = function(lineNumber) {
    return helper.padInner$('div').eq(lineNumber);
  }

  var getAuthorFromClassList = function(classes) {
    return classes.find(function(cls) {
      return cls.startsWith('author');
    });
  }

  var changeLineAndCheckOnlyThatChangeIsFromThisAuthor = function(lineNumber, textChange, done) {
    // get original author class
    var classes = getLine(lineNumber).find('span').first().attr('class').split(' ');
    var originalAuthor = getAuthorFromClassList(classes);

    // make change on target line
    var $regularLine = getLine(lineNumber);
    helper.selectLines($regularLine, $regularLine, 2, 2); // place caret after 2nd char of line
    $regularLine.sendkeys(textChange);

    // wait for change to be processed by Etherpad
    var otherAuthorsOfLine;
    helper.waitFor(function() {
      var authorsOfLine = getLine(lineNumber).find('span').map(function() {
        return getAuthorFromClassList($(this).attr('class').split(' '));
      }).get();
      otherAuthorsOfLine = authorsOfLine.filter(function(author) {
        return author !== originalAuthor;
      });
      var lineHasChangeOfThisAuthor = otherAuthorsOfLine.length > 0;
      return lineHasChangeOfThisAuthor;
    }).done(function() {
      var thisAuthor = otherAuthorsOfLine[0];
      var $changeOfThisAuthor = getLine(lineNumber).find('span.' + thisAuthor);
      expect($changeOfThisAuthor.text()).to.be(textChange);
      done();
    });
  }
});
