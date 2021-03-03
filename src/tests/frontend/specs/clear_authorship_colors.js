'use strict';

describe('clear authorship colors button', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('makes text clear authorship colors', function (done) {
    this.timeout(2500);
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // override the confirm dialogue functioon
    helper.padChrome$.window.confirm = function () {
      return true;
    };

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // Set some new text
    const sentText = 'Hello';

    // select this text element
    $firstTextElement.sendkeys('{selectall}');
    $firstTextElement.sendkeys(sentText);
    $firstTextElement.sendkeys('{rightarrow}');

    // wait until we have the full value available
    helper.waitFor(() => inner$('div span').first().attr('class').indexOf('author') !== -1
    ).done(() => {
      // IE hates you if you don't give focus to the inner frame bevore you do a clearAuthorship
      inner$('div').first().focus();

      // get the clear authorship colors button and click it
      const $clearauthorshipcolorsButton = chrome$('.buttonicon-clearauthorship');
      $clearauthorshipcolorsButton.click();

      // does the first div include an author class?
      const hasAuthorClass = inner$('div').first().attr('class').indexOf('author') !== -1;
      expect(hasAuthorClass).to.be(false);

      helper.waitFor(() => {
        const disconnectVisible =
            chrome$('div.disconnected').attr('class').indexOf('visible') === -1;
        return (disconnectVisible === true);
      });

      const disconnectVisible = chrome$('div.disconnected').attr('class').indexOf('visible') === -1;
      expect(disconnectVisible).to.be(true);

      done();
    });
  });

  it("makes text clear authorship colors and checks it can't be undone", function (done) {
    this.timeout(1500);
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // override the confirm dialogue functioon
    helper.padChrome$.window.confirm = function () {
      return true;
    };

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // Set some new text
    const sentText = 'Hello';

    // select this text element
    $firstTextElement.sendkeys('{selectall}');
    $firstTextElement.sendkeys(sentText);
    $firstTextElement.sendkeys('{rightarrow}');

    // wait until we have the full value available
    helper.waitFor(
        () => inner$('div span').first().attr('class').indexOf('author') !== -1
    ).done(() => {
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

      helper.waitFor(() => {
        const disconnectVisible =
            chrome$('div.disconnected').attr('class').indexOf('visible') === -1;
        return (disconnectVisible === true);
      });

      const disconnectVisible = chrome$('div.disconnected').attr('class').indexOf('visible') === -1;
      expect(disconnectVisible).to.be(true);

      done();
    });
  });
});
