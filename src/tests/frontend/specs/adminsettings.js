'use strict';

describe('Admin > Settings', function () {
  this.timeout(480000);

  before(async function () {
    let success = false;
    $.ajax({
      url: `${location.protocol}//admin:changeme@${location.hostname}:${location.port}/admin/`,
      type: 'GET',
      success: () => success = true,
    });
    await helper.waitForPromise(() => success === true);
  });

  beforeEach(async function () {
    helper.newAdmin('settings');
    // needed, because the load event is fired to early
    await helper.waitForPromise(() => helper.admin$ && helper.admin$('.settings').val().length > 0);
  });

  it('Are Settings visible, populated, does save work', async function () {
    // !IMPORTANT! We only run admin tests in one browser!
    if (!/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) this.skip();

    // save old value
    const settings = helper.admin$('.settings').val();
    const settingsLength = settings.length;

    // set new value
    helper.admin$('.settings').val((_, text) => `/* test */\n${text}`);
    await helper.waitForPromise(
        () => settingsLength + 11 === helper.admin$('.settings').val().length);

    // saves
    helper.admin$('#saveSettings').click();
    await helper.waitForPromise(() => helper.admin$('#response').is(':visible'));

    // new value for settings.json should now be saved
    // reset it to the old value
    helper.newAdmin('settings');
    await helper.waitForPromise(() => helper.admin$ && helper.admin$('.settings').val().length > 0);

    // replace the test value with a line break
    helper.admin$('.settings').val((_, text) => text.replace('/* test */\n', ''));
    await helper.waitForPromise(() => settingsLength === helper.admin$('.settings').val().length);

    helper.admin$('#saveSettings').click(); // saves
    await helper.waitForPromise(() => helper.admin$('#response').is(':visible'));

    // settings should have the old value
    helper.newAdmin('settings');
    await helper.waitForPromise(
        () => helper.admin$ && helper.admin$('.settings').val().length > 0, 36000);
    expect(settings).to.be(helper.admin$('.settings').val());
  });

  function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  it('restart works', async function () {
    // !IMPORTANT! We only run admin tests in one browser!
    if (!/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) this.skip();

    // restarts
    helper.admin$('#restartEtherpad').click();

    // Hacky...  Other suggestions welcome..
    await timeout(200000);
    let success = false;
    $.ajax({
      url: `${location.protocol}//admin:changeme@${location.hostname}:${location.port}/admin`,
      type: 'GET',
      success: () => success = true,
    });
    await helper.waitForPromise(() => success === true);
  });
});
