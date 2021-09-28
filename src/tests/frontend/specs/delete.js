'use strict';

describe('delete keystroke', function () {
  // create a new pad before each test run
  beforeEach(async function () {
    await helper.aNewPad();
  });

  it('makes text delete', async function () {
    const inner$ = helper.padInner$;

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // get the original length of this element
    const elementLength = $firstTextElement.text().length;

    // simulate key presses to delete content
    $firstTextElement.sendkeys('{leftarrow}'); // simulate a keypress of the left arrow key
    $firstTextElement.sendkeys('{del}'); // simulate a keypress of delete

    const $newFirstTextElement = inner$('div').first();

    // get the new length of this element
    const newElementLength = $newFirstTextElement.text().length;

    // expect it to be one char less in length
    expect(newElementLength).to.be((elementLength - 1));
  });
});
