'use strict';

describe('Admin > Settings', function () {
  before(async function () {
    let success = false;
    $.ajax({
      url: 'http://admin:changeme@localhost:9001/admin/',
      type: 'GET',
      success: () => success = true
    })
    await helper.waitForPromise(() => success === true);
  });

  beforeEach(async function () {
    helper.newAdmin('settings');
    // needed, because the load event is fired to early
    await helper.waitForPromise(() => helper.admin$ && helper.admin$('.settings').val().length > 0);
  });

  it('Are Settings visible, populated, does save work', async function () {
    const settings = helper.admin$('.settings').val();
    const settingsLength =  settings.length;
    helper.admin$('.settings').val((_, text) => '/* test */\n' + text);
    await helper.waitForPromise(() => settingsLength + 11 === helper.admin$('.settings').val().length)
    helper.admin$('#saveSettings').click(); // saves
    await helper.waitForPromise(() => helper.admin$('#response').is(':visible'));

    // new value for settings.json should now be saved
    // reset it to the old value
    helper.newAdmin('settings');
    await helper.waitForPromise(() => helper.admin$ && helper.admin$('.settings').val().length > 0);
    helper.admin$('.settings').val((_, text) => text.replace('/* test */\n', ''));
    await helper.waitForPromise(() => settingsLength === helper.admin$('.settings').val().length)
    helper.admin$('#saveSettings').click(); // saves
    await helper.waitForPromise(() => helper.admin$('#response').is(':visible'));

    // settings should have the old value
    helper.newAdmin('settings');
    await helper.waitForPromise(() => helper.admin$ && helper.admin$('.settings').val().length > 0);
    expect(settings).to.be(helper.admin$('.settings').val());
  });

  xit('restart works', async function(){
    helper.admin$('#restartEtherpad').click(); // restarts
    await timeout(5000); // Hacky...  Other suggestions welcome..
    try {
      await $.get('/');
      expect(true).to.be(true);
    } catch (e) {
      expect(true).to.be(false);
      throw new Error('Unable to load Admin page after restart.');
    }
  });
  /*
  TODO: Other tests
    Is JSON parseable (note that we need an additional library for this).
    If we modify JSON and save it is it available after clicking "save?"
    If we modify JSON and save/restart is the setting applied?
  */

  function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
});
