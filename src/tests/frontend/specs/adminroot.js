'use strict';

describe('Admin page', function () {
  this.timeout(480000);
  before(async function () {
    let success = false;
    $.ajax({
      url: `${location.protocol}//admin:changeme@${location.hostname}:${location.port}/admin/`,
      type: 'GET',
      success: () => success = true,
    });
    await helper.waitForPromise(() => success === true, 400000);
  });

  beforeEach(async function () {
    helper.newAdmin('');
    await helper.waitForPromise(
        () => helper.admin$('.menu').find('li').length >= 3, 200000);
  });

  it('Shows Plugin Manager Link', async function () {
    helper.waitForPromise(
        () => helper.admin$('a[data-l10n-id="admin_plugins"]').is(':visible'), 20000);
  });
  it('Shows Troubleshooting Info Link', async function () {
    helper.waitForPromise(
        () => helper.admin$('a[data-l10n-id="admin_plugins_info"]').is(':visible'), 20000);
  });
  it('Shows Settings Link', async function () {
    helper.waitForPromise(
        () => helper.admin$('a[data-l10n-id="admin_settings"]').is(':visible'), 20000);
  });
});
