'use strict';

describe('All the alphabet works n stuff', function () {
  const expectedString = 'abcdefghijklmnopqrstuvwxyz';

  // create a new pad before each test run
  beforeEach(async function () {
    await helper.aNewPad();
  });

  it('when you enter any char it appears right', function (done) {
    const inner$ = helper.padInner$;

    // get the first text element out of the inner iframe
    const firstTextElement = inner$('div').first();

    // simulate key presses to delete content
    firstTextElement.sendkeys('{selectall}'); // select all
    firstTextElement.sendkeys('{del}'); // clear the first line
    firstTextElement.sendkeys(expectedString); // insert the string

    helper.waitFor(() => inner$('div').first().text() === expectedString, 2000).done(done);
  });
});
