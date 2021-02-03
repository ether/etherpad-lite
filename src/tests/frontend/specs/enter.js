'use strict';

describe('enter keystroke', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('creates a new line & puts cursor onto a new line', function (done) {
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
});
