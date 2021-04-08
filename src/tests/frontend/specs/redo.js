'use strict';

describe('undo button then redo button', function () {
  beforeEach(async function () {
    await helper.aNewPad();
  });

  it('redo some typing with button', async function () {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // get the first text element inside the editable space
    const $firstTextElement = inner$('div span').first();
    const originalValue = $firstTextElement.text(); // get the original value
    const newString = 'Foo';

    $firstTextElement.sendkeys(newString); // send line 1 to the pad
    const modifiedValue = $firstTextElement.text(); // get the modified value
    expect(modifiedValue).not.to.be(originalValue); // expect the value to change

    // get undo and redo buttons
    const $undoButton = chrome$('.buttonicon-undo');
    const $redoButton = chrome$('.buttonicon-redo');
    // click the buttons
    $undoButton.click(); // removes foo
    $redoButton.click(); // resends foo

    await helper.waitForPromise(() => inner$('div span').first().text() === newString);
    const finalValue = inner$('div').first().text();
    expect(finalValue).to.be(modifiedValue); // expect the value to change
  });

  it('redo some typing with keypress', async function () {
    const inner$ = helper.padInner$;

    // get the first text element inside the editable space
    const $firstTextElement = inner$('div span').first();
    const originalValue = $firstTextElement.text(); // get the original value
    const newString = 'Foo';

    $firstTextElement.sendkeys(newString); // send line 1 to the pad
    const modifiedValue = $firstTextElement.text(); // get the modified value
    expect(modifiedValue).not.to.be(originalValue); // expect the value to change

    let e = new inner$.Event(helper.evtType);
    e.ctrlKey = true; // Control key
    e.which = 90; // z
    inner$('#innerdocbody').trigger(e);

    e = new inner$.Event(helper.evtType);
    e.ctrlKey = true; // Control key
    e.which = 121; // y
    inner$('#innerdocbody').trigger(e);

    await helper.waitForPromise(() => inner$('div span').first().text() === newString);
    const finalValue = inner$('div').first().text();
    expect(finalValue).to.be(modifiedValue); // expect the value to change
  });
});
