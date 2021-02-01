'use strict';

describe('author of pad edition', function () {
  const REGULAR_LINE = 0;
  const LINE_WITH_ORDERED_LIST = 1;
  const LINE_WITH_UNORDERED_LIST = 2;

  // author 1 creates a new pad with some content (regular lines and lists)
  before(function (done) {
    const padId = helper.newPad(() => {
      // make sure pad has at least 3 lines
      const $firstLine = helper.padInner$('div').first();
      const threeLines = ['regular line', 'line with ordered list', 'line with unordered list']
          .join('<br>');
      $firstLine.html(threeLines);

      // wait for lines to be processed by Etherpad
      helper.waitFor(() => {
        const $lineWithUnorderedList = getLine(LINE_WITH_UNORDERED_LIST);
        return $lineWithUnorderedList.text() === 'line with unordered list';
      }).done(() => {
        // create the unordered list
        const $lineWithUnorderedList = getLine(LINE_WITH_UNORDERED_LIST);
        $lineWithUnorderedList.sendkeys('{selectall}');

        const $insertUnorderedListButton = helper.padChrome$('.buttonicon-insertunorderedlist');
        $insertUnorderedListButton.click();

        helper.waitFor(() => {
          const $lineWithUnorderedList = getLine(LINE_WITH_UNORDERED_LIST);
          return $lineWithUnorderedList.find('ul li').length === 1;
        }).done(() => {
          // create the ordered list
          const $lineWithOrderedList = getLine(LINE_WITH_ORDERED_LIST);
          $lineWithOrderedList.sendkeys('{selectall}');

          const $insertOrderedListButton = helper.padChrome$('.buttonicon-insertorderedlist');
          $insertOrderedListButton.click();

          helper.waitFor(() => {
            const $lineWithOrderedList = getLine(LINE_WITH_ORDERED_LIST);
            return $lineWithOrderedList.find('ol li').length === 1;
          }).done(() => {
            // Reload pad, to make changes as a second user. Need a timeout here to make sure
            // all changes were saved before reloading
            setTimeout(() => {
              // Expire cookie, so author is changed after reloading the pad.
              // See https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie#Example_4_Reset_the_previous_cookie
              helper.padChrome$.document.cookie =
                  'token=foo;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

              helper.newPad(done, padId);
            }, 1000);
          });
        });
      });
    });
    this.timeout(60000);
  });

  // author 2 makes some changes on the pad
  it('marks only the new content as changes of the second user on a regular line', function (done) {
    changeLineAndCheckOnlyThatChangeIsFromThisAuthor(REGULAR_LINE, 'x', done);
  });

  it('marks only the new content as changes of the second user on a ' +
      'line with ordered list', function (done) {
    changeLineAndCheckOnlyThatChangeIsFromThisAuthor(LINE_WITH_ORDERED_LIST, 'y', done);
  });

  it('marks only the new content as changes of the second user on ' +
      'a line with unordered list', function (done) {
    changeLineAndCheckOnlyThatChangeIsFromThisAuthor(LINE_WITH_UNORDERED_LIST, 'z', done);
  });

  /* ********************** Helper functions ************************ */
  const getLine = (lineNumber) => helper.padInner$('div').eq(lineNumber);

  const getAuthorFromClassList = (classes) => classes.find((cls) => cls.startsWith('author'));

  const changeLineAndCheckOnlyThatChangeIsFromThisAuthor = (lineNumber, textChange, done) => {
    // get original author class
    const classes = getLine(lineNumber).find('span').first().attr('class').split(' ');
    const originalAuthor = getAuthorFromClassList(classes);

    // make change on target line
    const $regularLine = getLine(lineNumber);
    helper.selectLines($regularLine, $regularLine, 2, 2); // place caret after 2nd char of line
    $regularLine.sendkeys(textChange);

    // wait for change to be processed by Etherpad
    let otherAuthorsOfLine;
    helper.waitFor(() => {
      const authorsOfLine = getLine(lineNumber).find('span').map(function () {
        return getAuthorFromClassList($(this).attr('class').split(' '));
      }).get();
      otherAuthorsOfLine = authorsOfLine.filter((author) => author !== originalAuthor);
      const lineHasChangeOfThisAuthor = otherAuthorsOfLine.length > 0;
      return lineHasChangeOfThisAuthor;
    }).done(() => {
      const thisAuthor = otherAuthorsOfLine[0];
      const $changeOfThisAuthor = getLine(lineNumber).find(`span.${thisAuthor}`);
      expect($changeOfThisAuthor.text()).to.be(textChange);
      done();
    });
  };
});
