'use strict';

describe('Side Div Line Numbers', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('numbers line up with content', async () => {
    this.timeout(100);
    const inner$ = helper.padInner$;

    // get the first text element out of the inner iframe
    const $firstLine = inner$('div').first();

    // select this text element
    let i = 0;
    while (i < 40) {
      $firstLine
      .sendkeys('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
      i++;
    }

    const $firstLineNumber = helper.padOuter$('#sidedivinner').children().first("div");
    const $secondLine = $firstLine.next();
    await helper.waitForPromise(
      () => helper.padOuter$('#sidedivinner').children('div').first().next().text() === "2"
    )
    const $secondLineNumber = $firstLineNumber.next();
    expect($firstLine.offset().top).to.be.below($firstLineNumber.offset().top);
    expect($secondLine.offset().top).to.be.below($secondLineNumber.offset().top);
  });

});
