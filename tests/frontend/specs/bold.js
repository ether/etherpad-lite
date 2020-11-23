describe('bold button', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('makes text bold on click', function (done) {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // select this text element
    $firstTextElement.sendkeys('{selectall}');

    // get the bold button and click it
    const $boldButton = chrome$('.buttonicon-bold');
    $boldButton.click();

    // ace creates a new dom element when you press a button, so just get the first text element again
    const $newFirstTextElement = inner$('div').first();

    // is there a <b> element now?
    const isBold = $newFirstTextElement.find('b').length === 1;

    // expect it to be bold
    expect(isBold).to.be(true);

    // make sure the text hasn't changed
    expect($newFirstTextElement.text()).to.eql($firstTextElement.text());

    done();
  });

  it('makes text bold on keypress', function (done) {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // select this text element
    $firstTextElement.sendkeys('{selectall}');

    const e = inner$.Event(helper.evtType);
    e.ctrlKey = true; // Control key
    e.which = 66; // b
    inner$('#innerdocbody').trigger(e);

    // ace creates a new dom element when you press a button, so just get the first text element again
    const $newFirstTextElement = inner$('div').first();

    // is there a <b> element now?
    const isBold = $newFirstTextElement.find('b').length === 1;

    // expect it to be bold
    expect(isBold).to.be(true);

    // make sure the text hasn't changed
    expect($newFirstTextElement.text()).to.eql($firstTextElement.text());

    done();
  });
});
