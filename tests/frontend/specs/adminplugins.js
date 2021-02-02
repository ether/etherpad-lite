'use strict';

describe('Plugins page', function () {
  function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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
        () => helper.admin$ && helper.admin$('.menu').find('li').length >= 3);
  });

  it('Lists some plugins', async function () {
    await helper.waitForPromise(() => helper.admin$('.results').children().length > 50);
  });

  it('Searches for plugin', async function () {
    helper.admin$('#search-query').val('ep_font_color');
    await helper.waitForPromise(() => helper.admin$('.results').children().length < 300, 5000);
    await helper.waitForPromise(() => helper.admin$('.results').children().length > 0, 5000);
  });

  it('Attempt to Update a plugin', async function () {
    // !IMPORTANT! We only run admin tests in one browser!
    if (!/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) this.skip();
    this.timeout(120000);

    if (helper.admin$('.ep_align').length === 0) this.skip();

    await helper.waitForPromise(
        () => helper.admin$('.ep_align .version').text().split('.').length >= 2);

    const minorVersionBefore =
        parseInt(helper.admin$('.ep_align .version').text().split('.')[1]);

    if (!minorVersionBefore) {
      throw new Error('Unable to get minor number of plugin, is the plugin installed?');
    }

    if (minorVersionBefore !== 2) this.skip();

    helper.waitForPromise(
        () => helper.admin$('.ep_align .do-update').length === 1);

    await timeout(500); // HACK!  Please submit better fix..
    const $doUpdateButton = helper.admin$('.ep_align .do-update');
    $doUpdateButton.click();

    // ensure its showing as Updating
    await helper.waitForPromise(
        () => helper.admin$('.ep_align .message').text() === 'Updating');

    // Ensure it's a higher minor version IE 0.3.x as 0.2.x was installed
    // Coverage for https://github.com/ether/etherpad-lite/issues/4536
    await helper.waitForPromise(() => parseInt(helper.admin$(
        '.ep_align .version'
    )
        .text()
        .split('.')[1]) > minorVersionBefore, 60000, 1000);
    // allow 50 seconds, check every 1 second.
  });
  it('Attempt to Install a plugin', async function () {
    // !IMPORTANT! We only run admin tests in one browser!
    if (!/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) this.skip();
    this.timeout(240000);

    helper.admin$('#search-query').val('ep_activepads');
    await helper.waitForPromise(() => helper.admin$('.results').children().length < 300, 6000);
    await helper.waitForPromise(() => helper.admin$('.results').children().length > 0, 6000);

    // skip if we already have ep_activepads installed..
    if (helper.admin$('.ep_activepads .do-install').is(':visible') === false) this.skip();

    helper.admin$('.ep_activepads .do-install').click();
    // ensure install has attempted to be started
    await helper.waitForPromise(
        () => helper.admin$('.ep_activepads .do-install').length !== 0, 120000);
    // ensure its not showing installing any more
    await helper.waitForPromise(
        () => helper.admin$('.ep_activepads .message').text() === '', 180000);
    // ensure uninstall button is visible
    await helper.waitForPromise(
        () => helper.admin$('.ep_activepads .do-uninstall').length !== 0, 120000);
  });

  it('Attempt to Uninstall a plugin', async function () {
    // !IMPORTANT! We only run admin tests in one browser!
    if (!/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) this.skip();
    this.timeout(360000);
    await helper.waitForPromise(
        () => helper.admin$('.ep_activepads .do-uninstall').length !== 0, 120000);

    helper.admin$('.ep_activepads .do-uninstall').click();

    // ensure its showing uninstalling
    await helper.waitForPromise(
        () => helper.admin$('.ep_activepads .message')
            .text() === 'Uninstalling', 120000);
    // ensure its gone
    await helper.waitForPromise(
        () => helper.admin$('.ep_activepads').length === 0, 240000);

    helper.admin$('#search-query').val('ep_headings2');
    await helper.waitForPromise(() => helper.admin$('.results').children().length < 300, 6000);
    await helper.waitForPromise(() => helper.admin$('.results').children().length > 0, 6000);
  });
});
