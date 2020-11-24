describe('assign unordered list', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('insert unordered list text then removes by outdent', function (done) {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;
    const originalText = inner$('div').first().text();

    const $insertunorderedlistButton = chrome$('.buttonicon-insertunorderedlist');
    $insertunorderedlistButton.click();

    helper.waitFor(() => {
      const newText = inner$('div').first().text();
      if (newText === originalText) {
        return inner$('div').first().find('ul li').length === 1;
      }
    }).done(() => {
      // remove indentation by bullet and ensure text string remains the same
      chrome$('.buttonicon-outdent').click();
      helper.waitFor(() => {
        const newText = inner$('div').first().text();
        return (newText === originalText);
      }).done(() => {
        done();
      });
    });
  });
});

describe('unassign unordered list', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('insert unordered list text then remove by clicking list again', function (done) {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;
    const originalText = inner$('div').first().text();

    const $insertunorderedlistButton = chrome$('.buttonicon-insertunorderedlist');
    $insertunorderedlistButton.click();

    helper.waitFor(() => {
      const newText = inner$('div').first().text();
      if (newText === originalText) {
        return inner$('div').first().find('ul li').length === 1;
      }
    }).done(() => {
      // remove indentation by bullet and ensure text string remains the same
      $insertunorderedlistButton.click();
      helper.waitFor(() => {
        const isList = inner$('div').find('ul').length === 1;
        // sohuldn't be list
        return (isList === false);
      }).done(() => {
        done();
      });
    });
  });
});


describe('keep unordered list on enter key', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('Keeps the unordered list on enter for the new line', function (done) {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    const $insertorderedlistButton = chrome$('.buttonicon-insertunorderedlist');
    $insertorderedlistButton.click();

    // type a bit, make a line break and type again
    const $firstTextElement = inner$('div span').first();
    $firstTextElement.sendkeys('line 1');
    $firstTextElement.sendkeys('{enter}');
    $firstTextElement.sendkeys('line 2');
    $firstTextElement.sendkeys('{enter}');

    helper.waitFor(() => inner$('div span').first().text().indexOf('line 2') === -1).done(() => {
      const $newSecondLine = inner$('div').first().next();
      const hasULElement = $newSecondLine.find('ul li').length === 1;
      expect(hasULElement).to.be(true);
      expect($newSecondLine.text()).to.be('line 2');
      done();
    });
  });
});

describe('Pressing Tab in an UL increases and decreases indentation', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('indent and de-indent list item with keypress', function (done) {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // select this text element
    $firstTextElement.sendkeys('{selectall}');

    const $insertorderedlistButton = chrome$('.buttonicon-insertunorderedlist');
    $insertorderedlistButton.click();

    const e = inner$.Event(helper.evtType);
    e.keyCode = 9; // tab
    inner$('#innerdocbody').trigger(e);

    expect(inner$('div').first().find('.list-bullet2').length === 1).to.be(true);
    e.shiftKey = true; // shift
    e.keyCode = 9; // tab
    inner$('#innerdocbody').trigger(e);

    helper.waitFor(() => inner$('div').first().find('.list-bullet1').length === 1).done(done);
  });
});

describe('Pressing indent/outdent button in an UL increases and decreases indentation and bullet / ol formatting', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('indent and de-indent list item with indent button', function (done) {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // select this text element
    $firstTextElement.sendkeys('{selectall}');

    const $insertunorderedlistButton = chrome$('.buttonicon-insertunorderedlist');
    $insertunorderedlistButton.click();

    const $indentButton = chrome$('.buttonicon-indent');
    $indentButton.click(); // make it indented twice

    expect(inner$('div').first().find('.list-bullet2').length === 1).to.be(true);
    const $outdentButton = chrome$('.buttonicon-outdent');
    $outdentButton.click(); // make it deindented to 1

    helper.waitFor(() => inner$('div').first().find('.list-bullet1').length === 1).done(done);
  });
});
