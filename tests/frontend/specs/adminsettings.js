'use strict';

describe('Admin > Settings', function () {
  beforeEach(function (cb) {
    helper.newAdmin(cb, 'settings');
    this.timeout(60000);
  });

  it('Are Settings visible, populated, does save work and restart?', async function () {
    // Skip this test if we haven't set the disablePasswordRequirementForAdminUI to true
    if (!helper.disablePasswordRequirementForAdminUI) this.skip();
    await helper.waitForPromise(() => helper.admin$('.settings').val().length);
    helper.admin$('#saveSettings').click(); // saves
    await helper.waitForPromise(() => helper.admin$('#response').is(':visible'));
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
