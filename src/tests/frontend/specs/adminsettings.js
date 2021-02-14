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
    await helper.waitForPromise(
        () => helper.admin$ && helper.admin$('.settings').val().length > 0, 5000);
  });

  it('Are Settings visible, populated, does save work', async function () {
    // save old value
    const settings = helper.admin$('.settings').val();
    const settingsLength = settings.length;

    // set new value
    helper.admin$('.settings').val((_, text) => `/* test */\n${text}`);
    await helper.waitForPromise(
        () => settingsLength + 11 === helper.admin$('.settings').val().length, 5000);

    // saves
    helper.admin$('#saveSettings').click();
    await helper.waitForPromise(() => helper.admin$('#response').is(':visible'), 5000);

    // new value for settings.json should now be saved
    // reset it to the old value
    helper.newAdmin('settings');
    await helper.waitForPromise(
        () => helper.admin$ && helper.admin$('.settings').val().length > 0, 20000);

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

  it('restart works', async function () {
    this.timeout(60000);
    const getStartTime = async () => {
      try {
        const {httpStartTime} = await $.ajax({
          url: new URL('/stats', window.location.href),
          method: 'GET',
          dataType: 'json',
          timeout: 450, // Slightly less than the waitForPromise() interval.
        });
        return httpStartTime;
      } catch (err) {
        return null;
      }
    };
    await helper.waitForPromise(async () => {
      const startTime = await getStartTime();
      return startTime != null && startTime > 0 && Date.now() > startTime;
    }, 1000, 500);
    const clickTime = Date.now();
    helper.admin$('#restartEtherpad').click();
    await helper.waitForPromise(async () => {
      const startTime = await getStartTime();
      return startTime != null && startTime >= clickTime;
    }, 60000, 500);
  });
});
