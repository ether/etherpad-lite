'use strict';

describe('height regression after ace.js refactoring', function () {
  before(function (cb) {
    helper.newPad(cb);
  });

  // everything fits inside the viewport
  it('clientHeight should equal scrollHeight with few lines', function() {
    const aceOuter = helper.padChrome$('iframe')[0].contentDocument;
    const clientHeight = aceOuter.documentElement.clientHeight;
    const scrollHeight = aceOuter.documentElement.scrollHeight;
    expect(clientHeight).to.be(scrollHeight);
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
    const aceOuter = helper.padChrome$('iframe')[0].contentDocument;
    const clientHeight = aceOuter.documentElement.clientHeight;
    const scrollHeight = aceOuter.documentElement.scrollHeight;
    expect(clientHeight).to.be.lessThan(scrollHeight);
  });
});
