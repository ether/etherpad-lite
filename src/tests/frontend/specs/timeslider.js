'use strict';

// deactivated, we need a nice way to get the timeslider, this is ugly
xdescribe('timeslider button takes you to the timeslider of a pad', function () {
  beforeEach(async function () {
    await helper.aNewPad();
  });

  it('timeslider contained in URL', async function () {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // get the first text element inside the editable space
    const $firstTextElement = inner$('div span').first();
    const originalValue = $firstTextElement.text(); // get the original value
    $firstTextElement.sendkeys('Testing'); // send line 1 to the pad

    const modifiedValue = $firstTextElement.text(); // get the modified value
    expect(modifiedValue).not.to.be(originalValue); // expect the value to change

    // The value has changed so  we can..
    await helper.waitForPromise(() => modifiedValue !== originalValue);

    const $timesliderButton = chrome$('#timesliderlink');
    $timesliderButton.click(); // So click the timeslider link

    await helper.waitForPromise(() => {
      const iFrameURL = chrome$.window.location.href;
      if (iFrameURL) {
        return iFrameURL.indexOf('timeslider') !== -1;
      } else {
        return false; // the URL hasnt been set yet
      }
    });

    // click the buttons
    const iFrameURL = chrome$.window.location.href; // get the url
    const inTimeslider = iFrameURL.indexOf('timeslider') !== -1;
    expect(inTimeslider).to.be(true); // expect the value to change
  });
});
