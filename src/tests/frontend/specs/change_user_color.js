'use strict';

describe('change user color', function () {
  // create a new pad before each test run
  beforeEach(async function () {
    await helper.aNewPad();
  });

  it('Color picker matches original color and remembers the user color' +
      ' after a refresh', async function () {
    this.timeout(10000);
    let chrome$ = helper.padChrome$;

    // click on the settings button to make settings visible
    let $userButton = chrome$('.buttonicon-showusers');
    $userButton.click();

    let $userSwatch = chrome$('#myswatch');
    $userSwatch.click();

    const fb = chrome$.farbtastic('#colorpicker');
    const $colorPickerSave = chrome$('#mycolorpickersave');
    let $colorPickerPreview = chrome$('#mycolorpickerpreview');

    // Same color represented in two different ways
    const testColorHash = '#abcdef';
    const testColorRGB = 'rgb(171, 205, 239)';

    // Check that the color picker matches the automatically assigned random color on the swatch.
    // NOTE: This has a tiny chance of creating a false positive for passing in the
    // off-chance the randomly assigned color is the same as the test color.
    expect($colorPickerPreview.css('background-color')).to.be($userSwatch.css('background-color'));

    // The swatch updates as the test color is picked.
    fb.setColor(testColorHash);
    expect($colorPickerPreview.css('background-color')).to.be(testColorRGB);
    $colorPickerSave.click();
    expect($userSwatch.css('background-color')).to.be(testColorRGB);

    // give it a second to save the color on the server side
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // get a new pad, but don't clear the cookies
    await helper.aNewPad({clearCookies: false});

    chrome$ = helper.padChrome$;

    // click on the settings button to make settings visible
    $userButton = chrome$('.buttonicon-showusers');
    $userButton.click();

    $userSwatch = chrome$('#myswatch');
    $userSwatch.click();

    $colorPickerPreview = chrome$('#mycolorpickerpreview');

    expect($colorPickerPreview.css('background-color')).to.be(testColorRGB);
    expect($userSwatch.css('background-color')).to.be(testColorRGB);
  });

  it('Own user color is shown when you enter a chat', function (done) {
    this.timeout(1000);
    const chrome$ = helper.padChrome$;

    const $colorOption = helper.padChrome$('#options-colorscheck');
    if (!$colorOption.is(':checked')) {
      $colorOption.click();
    }

    // click on the settings button to make settings visible
    const $userButton = chrome$('.buttonicon-showusers');
    $userButton.click();

    const $userSwatch = chrome$('#myswatch');
    $userSwatch.click();

    const fb = chrome$.farbtastic('#colorpicker');
    const $colorPickerSave = chrome$('#mycolorpickersave');

    // Same color represented in two different ways
    const testColorHash = '#abcdef';
    const testColorRGB = 'rgb(171, 205, 239)';

    fb.setColor(testColorHash);
    $colorPickerSave.click();

    // click on the chat button to make chat visible
    const $chatButton = chrome$('#chaticon');
    $chatButton.click();
    const $chatInput = chrome$('#chatinput');
    $chatInput.sendkeys('O hi'); // simulate a keypress of typing user
    $chatInput.sendkeys('{enter}');

    // wait until the chat message shows up
    helper.waitFor(() => chrome$('#chattext').children('p').length !== 0
    ).done(() => {
      const $firstChatMessage = chrome$('#chattext').children('p');
      // expect the first chat message to be of the user's color
      expect($firstChatMessage.css('background-color')).to.be(testColorRGB);
      done();
    });
  });
});
