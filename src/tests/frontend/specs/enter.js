'use strict';

describe('enter keystroke', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });
  it('creates a new line & puts cursor onto a new line', function (done) {
    this.timeout(2000);
    const inner$ = helper.padInner$;

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // get the original string value minus the last char
    const originalTextValue = $firstTextElement.text();

    // simulate key presses to enter content
    $firstTextElement.sendkeys('{enter}');

    helper.waitFor(() => inner$('div').first().text() === '').done(() => {
      const $newSecondLine = inner$('div').first().next();
      const newFirstTextElementValue = inner$('div').first().text();
      expect(newFirstTextElementValue).to.be(''); // expect the first line to be blank
      // expect the second line to be the same as the original first line.
      expect($newSecondLine.text()).to.be(originalTextValue);
      done();
    });
  });

  it('enter is always visible after event', async function () {
    const originalLength = helper.padInner$('div').length;
    let $lastLine = helper.padInner$('div').last();

    // simulate key presses to enter content
    let i = 0;
    const numberOfLines = 15;
    let previousLineLength = originalLength;
    while (i < numberOfLines) {
      $lastLine = helper.padInner$('div').last();
      $lastLine.sendkeys('{enter}');
      await helper.waitForPromise(() => helper.padInner$('div').length > previousLineLength);
      previousLineLength = helper.padInner$('div').length;
      // check we can see the caret..

      i++;
    }
    await helper.waitForPromise(
        () => helper.padInner$('div').length === numberOfLines + originalLength);

    // is edited line fully visible?
    const lastLine = helper.padInner$('div').last();
    const bottomOfLastLine = lastLine.offset().top + lastLine.height();
    const scrolledWindow = helper.padChrome$('iframe')[0];
    await helper.waitForPromise(() => {
      const scrolledAmount =
          scrolledWindow.contentWindow.pageYOffset + scrolledWindow.contentWindow.innerHeight;
      return scrolledAmount >= bottomOfLastLine;
    });
  });
});
