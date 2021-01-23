'use strict';

describe('Plugins page', function () {
  before(async function () {
    let success = false;
    $.ajax({
      url: `${location.protocol}//admin:changeme@${location.hostname}:${location.port}/admin`,
      type: 'GET',
      success: () => success = true,
    });
    await helper.waitForPromise(() => success === true);
  });

  // create a new pad before each test run
  beforeEach(async function () {
    helper.newAdmin('plugins');
    await helper.waitForPromise(
        () => helper.admin$ && helper.admin$('.menu').find('li').length === 3);
  });

  it('Shows Plugin page', async function () {
    helper.admin$('a[data-l10n-id="admin_plugins"]')[0].click();
  });

  it('Lists some plugins', async function () {
    await helper.waitForPromise(() => helper.admin$('.results').children().length > 50);
  });

  it('Searches for plugin', async function () {
    helper.admin$('#search-query').val('ep_activepads');
    await helper.waitForPromise(() => helper.admin$('.results').children().length < 300);
    await helper.waitForPromise(() => helper.admin$('.results').children().length > 0);
  });

  it('Attempt to install a plugin', async function () {
    helper.admin$('#search-query').val('ep_activepads');
    await helper.waitForPromise(() => helper.admin$('.results').children().length < 300);
    await helper.waitForPromise(() => helper.admin$('.results').children().length > 0);

    helper.admin$('.ep_activepads .do-install').click();
    // ensure install has attempted to be started
    await helper.waitForPromise(
        () => helper.admin$('#installed-plugins .ep_activepads .do-install').length !== 0);
    // ensure its not showing installing any more
    await helper.waitForPromise(
        () => helper.admin$('#installed-plugins .ep_activepads .message').text() === '');
    // ensure uninstall button is visible
    await helper.waitForPromise(
        () => helper.admin$('#installed-plugins .ep_activepads .do-uninstall').length !== 0);
  });

  it('Attempt to Uninstall a plugin', async function () {
    helper.admin$('#installed-plugins .ep_activepads .do-uninstall').click();
    // ensure its showing uninstalling
    await helper.waitForPromise(
        () => helper.admin$('#installed-plugins .ep_activepads .message').text() === 'Uninstalling');
    // ensure its gone
    await helper.waitForPromise(
        () => helper.admin$('#installed-plugins .ep_activepads').length === 0);
  });
});
