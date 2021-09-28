'use strict';

describe('Language select and change', function () {
  // Destroy language cookies
  window.Cookies.remove('language');

  // create a new pad before each test run
  beforeEach(async function () {
    await helper.aNewPad();
  });

  // Destroy language cookies
  it('makes text german', async function () {
    this.timeout(1000);
    const chrome$ = helper.padChrome$;

    // click on the settings button to make settings visible
    const $settingsButton = chrome$('.buttonicon-settings');
    $settingsButton.click();

    // click the language button
    const $language = chrome$('#languagemenu');
    const $languageoption = $language.find('[value=de]');

    // select german
    $languageoption.attr('selected', 'selected');
    $language.change();

    await helper.waitForPromise(
        () => chrome$('.buttonicon-bold').parent()[0].title === 'Fett (Strg-B)');

    // get the value of the bold button
    const $boldButton = chrome$('.buttonicon-bold').parent();

    // get the title of the bold button
    const boldButtonTitle = $boldButton[0].title;

    // check if the language is now german
    expect(boldButtonTitle).to.be('Fett (Strg-B)');
  });

  it('makes text English', async function () {
    this.timeout(1000);
    const chrome$ = helper.padChrome$;

    // click on the settings button to make settings visible
    const $settingsButton = chrome$('.buttonicon-settings');
    $settingsButton.click();

    // click the language button
    const $language = chrome$('#languagemenu');
    // select english
    $language.val('en');
    $language.change();

    // get the value of the bold button
    let $boldButton = chrome$('.buttonicon-bold').parent();

    await helper.waitForPromise(() => $boldButton[0].title !== 'Fett (Strg+B)');

    // get the value of the bold button
    $boldButton = chrome$('.buttonicon-bold').parent();

    // get the title of the bold button
    const boldButtonTitle = $boldButton[0].title;

    // check if the language is now English
    expect(boldButtonTitle).to.be('Bold (Ctrl+B)');
  });

  it('changes direction when picking an rtl lang', async function () {
    this.timeout(1000);
    const chrome$ = helper.padChrome$;

    // click on the settings button to make settings visible
    const $settingsButton = chrome$('.buttonicon-settings');
    $settingsButton.click();

    // click the language button
    const $language = chrome$('#languagemenu');
    const $languageoption = $language.find('[value=ar]');

    // select arabic
    // $languageoption.attr('selected','selected'); // Breaks the test..
    $language.val('ar');
    $languageoption.change();

    await helper.waitForPromise(() => chrome$('html')[0].dir !== 'ltr');

    // check if the document's direction was changed
    expect(chrome$('html')[0].dir).to.be('rtl');
  });

  it('changes direction when picking an ltr lang', async function () {
    const chrome$ = helper.padChrome$;

    // click on the settings button to make settings visible
    const $settingsButton = chrome$('.buttonicon-settings');
    $settingsButton.click();

    // click the language button
    const $language = chrome$('#languagemenu');
    const $languageoption = $language.find('[value=en]');

    // select english
    // select arabic
    $languageoption.attr('selected', 'selected');
    $language.val('en');
    $languageoption.change();

    await helper.waitForPromise(() => chrome$('html')[0].dir !== 'rtl');

    // check if the document's direction was changed
    expect(chrome$('html')[0].dir).to.be('ltr');
  });
});
