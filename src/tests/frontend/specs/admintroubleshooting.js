'use strict';

describe('Admin Troupbleshooting page', function () {
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
    helper.newAdmin('plugins/info');
    await helper.waitForPromise(
        () => helper.admin$ && helper.admin$('.menu').find('li').length >= 3);
  });

  it('Shows Troubleshooting page Manager', async function () {
    helper.admin$('a[data-l10n-id="admin_plugins_info"]')[0].click();
  });

  it('Shows a version number', async function () {
    const content = helper.admin$('span[data-l10n-id="admin_plugins_info.version_number"]')
        .parent().text();
    const version = content.split(': ')[1].split('.');
    if (version.length !== 3) {
      throw new Error('Not displaying a semver version number');
    }
  });

  it('Lists installed parts', async function () {
    const parts = helper.admin$('pre')[1];
    if (parts.textContent.indexOf('ep_etherpad-lite/adminsettings') === -1) {
      throw new Error('No admin setting part being displayed...');
    }
  });

  it('Lists installed hooks', async function () {
    const parts = helper.admin$('dt');
    if (parts.length <= 20) {
      throw new Error('Not enough hooks being displayed...');
    }
  });
});
