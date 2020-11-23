describe('urls', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('when you enter an url, it becomes clickable', function (done) {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // get the first text element out of the inner iframe
    const firstTextElement = inner$('div').first();

    // simulate key presses to delete content
    firstTextElement.sendkeys('{selectall}'); // select all
    firstTextElement.sendkeys('{del}'); // clear the first line
    firstTextElement.sendkeys('https://etherpad.org'); // insert a URL

    helper.waitFor(() => inner$('div').first().find('a').length === 1, 2000).done(done);
  });

  it('when you enter a url containing a !, it becomes clickable and contains the whole URL', function (done) {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // get the first text element out of the inner iframe
    const firstTextElement = inner$('div').first();
    const url = 'https://etherpad.org/!foo';

    // simulate key presses to delete content
    firstTextElement.sendkeys('{selectall}'); // select all
    firstTextElement.sendkeys('{del}'); // clear the first line
    firstTextElement.sendkeys(url); // insert a URL

    helper.waitFor(() => {
      if (inner$('div').first().find('a').length === 1) { // if it contains an A link
        if (inner$('div').first().find('a')[0].href === url) {
          return true;
        }
      }
    }, 2000).done(done);
  });

  it('when you enter a url followed by a ], the ] is not included in the URL', function (done) {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // get the first text element out of the inner iframe
    const firstTextElement = inner$('div').first();
    const url = 'https://etherpad.org/';

    // simulate key presses to delete content
    firstTextElement.sendkeys('{selectall}'); // select all
    firstTextElement.sendkeys('{del}'); // clear the first line
    firstTextElement.sendkeys(url); // insert a URL
    firstTextElement.sendkeys(']'); // put a ] after it

    helper.waitFor(() => {
      if (inner$('div').first().find('a').length === 1) { // if it contains an A link
        if (inner$('div').first().find('a')[0].href === url) {
          return true;
        }
      }
    }, 2000).done(done);
  });
});
