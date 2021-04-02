'use strict';

describe('height regression after ace.js refactoring', function () {
  before(async function () {
    await helper.aNewPad();
  });

  // everything fits inside the viewport
  it('clientHeight should equal scrollHeight with few lines', async function () {
    await helper.clearPad();
    const outerHtml = helper.padChrome$('iframe')[0].contentDocument.documentElement;
    // Give some time for the heights to settle.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(outerHtml.clientHeight).to.be(outerHtml.scrollHeight);
  });

  it('client height should be less than scrollHeight with many lines', async function () {
    await helper.clearPad();
    await helper.edit('Test line\n' +
      '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n' +
      '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n' +
      '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n' +
      '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n' +
      '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n' +
      '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n' +
      '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n');
    const outerHtml = helper.padChrome$('iframe')[0].contentDocument.documentElement;
    // Need to poll because the heights take some time to settle.
    await helper.waitForPromise(() => outerHtml.clientHeight < outerHtml.scrollHeight);
  });
});
