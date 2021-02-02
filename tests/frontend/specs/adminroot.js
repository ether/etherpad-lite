'use strict';

describe('Admin page', function () {
  if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) this.skip();
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
    helper.newAdmin('');
    await helper.waitForPromise(
        () => helper.admin$ && helper.admin$('.menu').find('li').length >= 3);
  });

  it('Shows Plugin Manager Link', async function () {
    helper.admin$('a[data-l10n-id="admin_plugins"]').is(':visible');
  });
  it('Shows Troubleshooting Info Link', async function () {
    helper.admin$('a[data-l10n-id="admin_plugins_info"]').is(':visible');
  });
  it('Shows Settings Link', async function () {
    helper.admin$('a[data-l10n-id="admin_settings"]').is(':visible');
  });
});
