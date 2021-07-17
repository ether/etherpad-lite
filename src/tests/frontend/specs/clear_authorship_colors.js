'use strict';

describe('clear authorship colors button', function () {
  // create a new pad before each test run
  beforeEach(async function () {
    await helper.aNewPad();
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
    inner$('div').first().trigger('focus');

    // get the clear authorship colors button and click it
    const $clearauthorshipcolorsButton = chrome$('.buttonicon-clearauthorship');
    $clearauthorshipcolorsButton.trigger('click');

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
    inner$('div').first().trigger('focus');

    // get the clear authorship colors button and click it
    const $clearauthorshipcolorsButton = chrome$('.buttonicon-clearauthorship');
    $clearauthorshipcolorsButton.trigger('click');

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
    $undoButton.trigger('click'); // shouldn't do anything
    hasAuthorClass = inner$('div').first().attr('class').indexOf('author') !== -1;
    expect(hasAuthorClass).to.be(false);

    await helper.waitForPromise(
        () => chrome$('div.disconnected').attr('class').indexOf('visible') === -1);
  });
});
