'use strict';

describe('clear authorship colors button', function () {
  let padId;

  // create a new pad before each test run
  beforeEach(async function () {
    padId = await helper.aNewPad();
  });

  it('makes text clear authorship colors', async function () {
    this.timeout(2500);
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // override the confirm dialogue functioon
    helper.padChrome$.window.confirm = () => true;

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // Set some new text
    const sentText = 'Hello';

    // select this text element
    $firstTextElement.sendkeys('{selectall}');
    $firstTextElement.sendkeys(sentText);
    $firstTextElement.sendkeys('{rightarrow}');

    // wait until we have the full value available
    await helper.waitForPromise(
        () => inner$('div span').first().attr('class').indexOf('author') !== -1);

    // IE hates you if you don't give focus to the inner frame bevore you do a clearAuthorship
    inner$('div').first().focus();

    // get the clear authorship colors button and click it
    const $clearauthorshipcolorsButton = chrome$('.buttonicon-clearauthorship');
    $clearauthorshipcolorsButton.click();

    // does the first div include an author class?
    const hasAuthorClass = inner$('div').first().attr('class').indexOf('author') !== -1;
    expect(hasAuthorClass).to.be(false);

    await helper.waitForPromise(
        () => chrome$('div.disconnected').attr('class').indexOf('visible') === -1);
  });

  it("makes text clear authorship colors and checks it can't be undone", async function () {
    this.timeout(1500);
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // override the confirm dialogue functioon
    helper.padChrome$.window.confirm = () => true;

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // Set some new text
    const sentText = 'Hello';

    // select this text element
    $firstTextElement.sendkeys('{selectall}');
    $firstTextElement.sendkeys(sentText);
    $firstTextElement.sendkeys('{rightarrow}');

    // wait until we have the full value available
    await helper.waitForPromise(
        () => inner$('div span').first().attr('class').indexOf('author') !== -1);

    // IE hates you if you don't give focus to the inner frame bevore you do a clearAuthorship
    inner$('div').first().focus();

    // get the clear authorship colors button and click it
    const $clearauthorshipcolorsButton = chrome$('.buttonicon-clearauthorship');
    $clearauthorshipcolorsButton.click();

    // does the first div include an author class?
    let hasAuthorClass = inner$('div').first().attr('class').indexOf('author') !== -1;
    expect(hasAuthorClass).to.be(false);

    const e = new inner$.Event(helper.evtType);
    e.ctrlKey = true; // Control key
    e.which = 90; // z
    inner$('#innerdocbody').trigger(e); // shouldn't od anything

    // does the first div include an author class?
    hasAuthorClass = inner$('div').first().attr('class').indexOf('author') !== -1;
    expect(hasAuthorClass).to.be(false);

    // get undo and redo buttons
    const $undoButton = chrome$('.buttonicon-undo');

    // click the button
    $undoButton.click(); // shouldn't do anything
    hasAuthorClass = inner$('div').first().attr('class').indexOf('author') !== -1;
    expect(hasAuthorClass).to.be(false);

    await helper.waitForPromise(
        () => chrome$('div.disconnected').attr('class').indexOf('visible') === -1);
  });

  // Test for https://github.com/ether/etherpad-lite/issues/5128
  it('clears authorship when first line has line attributes', async function () {
    // override the confirm dialogue function
    helper.padChrome$.window.confirm = () => true;

    // Make sure there is text with author info. The first line must have a line attribute.
    await helper.clearPad();
    await helper.edit('Hello');
    helper.padChrome$('.buttonicon-insertunorderedlist').click();
    await helper.waitForPromise(() => helper.padInner$('[class*="author-"]').length > 0);

    const nCommits = helper.commits.length;
    helper.padChrome$('.buttonicon-clearauthorship').click();
    await helper.waitForPromise(() => helper.padInner$('[class*="author-"]').length === 0);

    // Make sure the change was actually accepted by reloading the pad and looking for authorship.
    // Before the pad can be reloaded the server might need some time to accept the change.
    await helper.waitForPromise(() => helper.commits.length > nCommits);
    await helper.aNewPad({id: padId});
    expect(helper.padInner$('[class*="author-"]').length).to.be(0);
  });
});
