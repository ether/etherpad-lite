describe('strikethrough button', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('makes text strikethrough', function (done) {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // select this text element
    $firstTextElement.sendkeys('{selectall}');

    // get the strikethrough button and click it
    const $strikethroughButton = chrome$('.buttonicon-strikethrough');
    $strikethroughButton.click();

    // ace creates a new dom element when you press a button, so just get the first text element again
    const $newFirstTextElement = inner$('div').first();

    // is there a <i> element now?
    const isstrikethrough = $newFirstTextElement.find('s').length === 1;

    // expect it to be strikethrough
    expect(isstrikethrough).to.be(true);

    // make sure the text hasn't changed
    expect($newFirstTextElement.text()).to.eql($firstTextElement.text());

    done();
  });
});
