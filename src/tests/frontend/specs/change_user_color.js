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
});
