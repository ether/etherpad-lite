describe('delete keystroke', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('makes text delete', function (done) {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // get the original length of this element
    const elementLength = $firstTextElement.text().length;

    // get the original string value minus the last char
    const originalTextValue = $firstTextElement.text();
    const originalTextValueMinusFirstChar = originalTextValue.substring(1, originalTextValue.length);

    // simulate key presses to delete content
    $firstTextElement.sendkeys('{leftarrow}'); // simulate a keypress of the left arrow key
    $firstTextElement.sendkeys('{del}'); // simulate a keypress of delete

    // ace creates a new dom element when you press a keystroke, so just get the first text element again
    const $newFirstTextElement = inner$('div').first();

    // get the new length of this element
    const newElementLength = $newFirstTextElement.text().length;

    // expect it to be one char less in length
    expect(newElementLength).to.be((elementLength - 1));

    done();
  });
});
