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
    const save = async () => {
      const p = new Promise((resolve) => {
        const observer = new MutationObserver(() => { resolve(); observer.disconnect(); });
        observer.observe(
            helper.admin$('#response')[0], {attributes: true, childList: false, subtree: false});
      });
      helper.admin$('#saveSettings').click();
      await p;
    };

    // save old value
    const settings = helper.admin$('.settings').val();
    const settingsLength = settings.length;

    // set new value
    helper.admin$('.settings').val((_, text) => `/* test */\n${text}`);
    await helper.waitForPromise(
        () => settingsLength + 11 === helper.admin$('.settings').val().length, 5000);
    await save();

    // new value for settings.json should now be saved
    // reset it to the old value
    helper.newAdmin('settings');
    await helper.waitForPromise(
        () => helper.admin$ &&
                helper.admin$('.settings').val().length === settingsLength + 11, 20000);

    // replace the test value with a line break
    helper.admin$('.settings').val((_, text) => text.replace('/* test */\n', ''));
    await helper.waitForPromise(() => settingsLength === helper.admin$('.settings').val().length);
    await save();

    // settings should have the old value
    helper.newAdmin('settings');
    await helper.waitForPromise(
        () => helper.admin$ && helper.admin$('.settings').val().length === settingsLength &&
          settings === helper.admin$('.settings').val(), 20000);
  });

  it('restart works', async function () {
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
        document.getElementById('console').append(
            `an error occurred: ${err.message} of type ${err.name}\n`);
        return null;
      }
    };
    let oldStartTime;
    await helper.waitForPromise(async () => {
      oldStartTime = await getStartTime();
      return oldStartTime != null && oldStartTime > 0;
    }, 1000, 500);
    helper.admin$('#restartEtherpad').click();
    await helper.waitForPromise(async () => {
      const startTime = await getStartTime();
      return startTime != null && startTime > oldStartTime;
    }, 60000, 500);
  });
});
