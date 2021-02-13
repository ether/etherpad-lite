'use strict';

describe('undo button then redo button', function () {
  beforeEach(function (cb) {
    helper.newPad(cb); // creates a new pad
    this.timeout(60000);
  });

  it('redo some typing with button', function (done) {
    this.timeout(200);
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

    helper.waitFor(() => inner$('div span').first().text() === newString).done(() => {
      const finalValue = inner$('div').first().text();
      expect(finalValue).to.be(modifiedValue); // expect the value to change
      done();
    });
  });

  it('redo some typing with keypress', function (done) {
    this.timeout(200);
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

    helper.waitFor(() => inner$('div span').first().text() === newString).done(() => {
      const finalValue = inner$('div').first().text();
      expect(finalValue).to.be(modifiedValue); // expect the value to change
      done();
    });
  });
});
