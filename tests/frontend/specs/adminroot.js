'use strict';

describe('Admin page', function () {
  before(async function () {
    let success = false;
    $.ajax({
      url: 'http://admin:changeme@localhost:9001/admin/',
      type: 'GET',
      success: () => success = true
    })
    await helper.waitForPromise(() => success === true);
  });

  // create a new pad before each test run
  beforeEach(async function () {
    helper.newAdmin('');
    await helper.waitForPromise(() => helper.admin$ && helper.admin$('.menu').find('li').length === 3);
  });

  it('Shows Plugin Manager', async function () {
    helper.admin$('a[data-l10n-id="admin_plugins"]')[0].click();
    //TODO check if we're on plugins page
  });

  //TODO why does it not work?
  xit('Shows Troubleshooting information', async function () {
    helper.admin$('a[data-l10n-id="admin_plugins_info"]')[0].click();
    await helper.waitForPromise(() => helper.admin$ && helper.admin$('tbody.results').find('tr').length > 50);
  });
});
