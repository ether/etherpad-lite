'use strict';

describe('undo button', function () {
  beforeEach(async function () {
    await helper.aNewPad();
  });

  it('undo some typing by clicking undo button', async function () {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // get the first text element inside the editable space
    const $firstTextElement = inner$('div span').first();
    const originalValue = $firstTextElement.text(); // get the original value

    $firstTextElement.sendkeys('foo'); // send line 1 to the pad
    const modifiedValue = $firstTextElement.text(); // get the modified value
    expect(modifiedValue).not.to.be(originalValue); // expect the value to change

    // get clear authorship button as a variable
    const $undoButton = chrome$('.buttonicon-undo');
    // click the button
    $undoButton.click();

    await helper.waitForPromise(() => inner$('div span').first().text() === originalValue);
  });

  it('undo some typing using a keypress', async function () {
    const inner$ = helper.padInner$;

    // get the first text element inside the editable space
    const $firstTextElement = inner$('div span').first();
    const originalValue = $firstTextElement.text(); // get the original value

    $firstTextElement.sendkeys('foo'); // send line 1 to the pad
    const modifiedValue = $firstTextElement.text(); // get the modified value
    expect(modifiedValue).not.to.be(originalValue); // expect the value to change

    const e = new inner$.Event(helper.evtType);
    e.ctrlKey = true; // Control key
    e.which = 90; // z
    inner$('#innerdocbody').trigger(e);

    await helper.waitForPromise(() => inner$('div span').first().text() === originalValue);
  });
});
