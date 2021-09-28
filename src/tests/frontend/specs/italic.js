'use strict';

describe('italic some text', function () {
  // create a new pad before each test run
  beforeEach(async function () {
    await helper.aNewPad();
  });

  it('makes text italic using button', async function () {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // select this text element
    $firstTextElement.sendkeys('{selectall}');

    // get the bold button and click it
    const $boldButton = chrome$('.buttonicon-italic');
    $boldButton.click();

    // ace creates a new dom element when you press a button, just get the first text element again
    const $newFirstTextElement = inner$('div').first();

    // is there a <i> element now?
    const isItalic = $newFirstTextElement.find('i').length === 1;

    // expect it to be bold
    expect(isItalic).to.be(true);

    // make sure the text hasn't changed
    expect($newFirstTextElement.text()).to.eql($firstTextElement.text());
  });

  it('makes text italic using keypress', async function () {
    const inner$ = helper.padInner$;

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // select this text element
    $firstTextElement.sendkeys('{selectall}');

    const e = new inner$.Event(helper.evtType);
    e.ctrlKey = true; // Control key
    e.which = 105; // i
    inner$('#innerdocbody').trigger(e);

    // ace creates a new dom element when you press a button, just get the first text element again
    const $newFirstTextElement = inner$('div').first();

    // is there a <i> element now?
    const isItalic = $newFirstTextElement.find('i').length === 1;

    // expect it to be bold
    expect(isItalic).to.be(true);

    // make sure the text hasn't changed
    expect($newFirstTextElement.text()).to.eql($firstTextElement.text());
  });
});
