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
    // menu is plugins, settings, help - so at least three entries atm
    await helper.waitForPromise(
        () => helper.admin$ && helper.admin$('.menu').find('li').length >= 3, 30000);
  });

  it('Lists some plugins assuming more than 50 available plugins', async function () {
    await helper.waitForPromise(() => helper.admin$('.results').children().length > 50, 20000);
  });

  it('Searches for plugin ep_font_color', async function () {
    helper.admin$('#search-query').val('ep_font_color');
    await helper.waitForPromise(() => helper.admin$('.results').children().length > 0, 10000);
    // multiple packages may be found
    await helper.waitForPromise(() => helper.admin$('.results').children().length < 20, 10000);
    await helper.waitForPromise(() => helper.admin$('.results .ep_font_color').length === 1, 10000);
  });

  it('Second search for ep_font_size does not return old result', async function () {
    helper.admin$('#search-query').val('ep_font_size');
    await helper.waitForPromise(() => helper.admin$('.results').children().length > 0, 10000);
    // multiple packages may be found
    await helper.waitForPromise(() => helper.admin$('.results').children().length < 20, 10000);
    await helper.waitForPromise(() => helper.admin$('.results .ep_font_size').length === 1, 10000);
    await helper.waitForPromise(() => helper.admin$('.results .ep_font_color').length === 0, 10000);
  });

  it('Searches for plugins ep_font_ (partial match)', async function () {
    helper.admin$('#search-query').val('ep_font');
    await helper.waitForPromise(() => helper.admin$('.results').children().length > 0, 10000);
    // multiple packages may be found
    await helper.waitForPromise(() => helper.admin$('.results').children().length < 50, 10000);
    await helper.waitForPromise(() => helper.admin$('.results .ep_font_size').length === 1, 10000);
    await helper.waitForPromise(() => helper.admin$('.results .ep_font_color').length === 1, 10000);
  });

  it('Attempt to Update a plugin (minor version update)', async function () {
    this.timeout(280000);

    // available plugin list should load
    await helper.waitForPromise(() => helper.admin$('.results').children().length > 50, 20000);

    // ep_align should be installed (via step in workflow)
    await helper.waitForPromise(() => helper.admin$('#installed-plugins .ep_align').length >= 1, 10000);

    let latestVersion;
    await helper.waitForPromise(
        () => {
          latestVersion = helper.admin$('#installed-plugins .ep_align .version').text();
          return latestVersion === '0.2.27';
        }
    );

    const minorVersionBefore =
        parseInt(latestVersion.split('.')[1]);

    await helper.waitForPromise(
        () => helper.admin$('#installed-plugins .ep_align .do-update').length === 1);

    helper.admin$('#installed-plugins .ep_align .do-update').click();

    // ensure its showing as Updating
    // this assumes that updating will take some time, so there is a message showing up
    // in the mean time
    await helper.waitForPromise(
        () => {
		const message = helper.admin$('#installed-plugins .ep_align .message').text();
		return message === 'Updating';
	}, 120000)

    // Ensure it's a higher minor version IE 0.3.x as 0.2.x was installed
    // Coverage for https://github.com/ether/etherpad-lite/issues/4536
    await helper.waitForPromise(() => parseInt(helper.admin$('#installed-plugins .ep_align .version')
        .text()
        .split('.')[1]) > minorVersionBefore, 60000, 1000);

    // ensure it's the latest version
    await helper.waitForPromise(
        () => helper.admin$('.ep_align .do-update').length === 0);
  });

  it('Attempt to Install a plugin', async function () {
    this.timeout(280000);

    helper.admin$('#search-query').val('ep_headings2');
    await helper.waitForPromise(() => helper.admin$('.results').children().length > 0, 10000);
    await helper.waitForPromise(() => helper.admin$('.results').children().length < 50, 10000);

    helper.admin$('.ep_headings2 .do-install').click();
    // ensure install has attempted to be started
    await helper.waitForPromise(
        () => helper.admin$('.ep_headings2 .do-install').length > 0, 120000);
    // ensure its not showing installing any more
    await helper.waitForPromise(
        () => helper.admin$('.ep_headings2 .message').text() === '', 180000);
    // ensure uninstall button is visible
    await helper.waitForPromise(
        () => helper.admin$('#installed-plugins .ep_headings2 .do-uninstall').length > 0, 120000);
  });

  it('Attempt to Uninstall a plugin', async function () {
    this.timeout(280000);

    await helper.waitForPromise(
        () => helper.admin$('#installed-plugins .ep_headings2 .do-uninstall').length > 0, 120000);

    helper.admin$('#installed-plugins .ep_headings2 .do-uninstall').click();

    // ensure its showing uninstalling
    // this assumes that uninstalling will take some time, so there is a message showing up
    // in the mean time
    await helper.waitForPromise(
        () => helper.admin$('#installed-plugins .ep_headings2 .message')
            .text() === 'Uninstalling', 120000);
    // ensure its gone
    await helper.waitForPromise(() => helper.admin$('#installed-plugins .ep_headings2').length === 0, 200000);

    // ensure search still works
    helper.admin$('#search-query').val('ep_font');
    await helper.waitForPromise(() => helper.admin$('.results').children().length < 50, 240000);
    await helper.waitForPromise(() => helper.admin$('.results').children().length > 0, 1000);
    await helper.waitForPromise(() => helper.admin$('.results .ep_font_size').length === 1, 10000);
    await helper.waitForPromise(() => helper.admin$('.results .ep_font_color').length === 1, 10000);
  });
});
