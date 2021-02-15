'use strict';

describe('the test helper', function () {
  describe('the newPad method', function () {
    xit("doesn't leak memory if you creates iframes over and over again", function (done) {
      this.timeout(100000);

      let times = 10;

      const loadPad = () => {
        helper.newPad(() => {
          times--;
          if (times > 0) {
            loadPad();
          } else {
            done();
          }
        });
      };

      loadPad();
    });

    it('gives me 3 jquery instances of chrome, outer and inner', function (done) {
      this.timeout(10000);

      helper.newPad(() => {
        // check if the jquery selectors have the desired elements
        expect(helper.padChrome$('#editbar').length).to.be(1);
        expect(helper.padOuter$('#outerdocbody').length).to.be(1);
        expect(helper.padInner$('#innerdocbody').length).to.be(1);

        // check if the document object was set correctly
        expect(helper.padChrome$.window.document).to.be(helper.padChrome$.document);
        expect(helper.padOuter$.window.document).to.be(helper.padOuter$.document);
        expect(helper.padInner$.window.document).to.be(helper.padInner$.document);

        done();
      });
    });
    // Make sure the cookies are cleared, and make sure that the cookie
    // clearing has taken effect at this point in the code. It has been
    // observed that the former can happen without the latter if there
    // isn't a timeout (within `newPad`) after clearing the cookies.
    // However this doesn't seem to always be easily replicated, so this
    // timeout may or may end up in the code. None the less, we test here
    // to catch it if the bug comes up again.
    it('clears cookies', function (done) {
      this.timeout(60000);

      // set cookies far into the future to make sure they're not expired yet
      window.document.cookie = 'token=foo;expires=Thu, 01 Jan 3030 00:00:00 GMT; path=/';
      window.document.cookie = 'language=bar;expires=Thu, 01 Jan 3030 00:00:00 GMT; path=/';

      expect(window.document.cookie).to.contain('token=foo');
      expect(window.document.cookie).to.contain('language=bar');

      helper.newPad(() => {
        // helper function seems to have cleared cookies
        // NOTE: this doesn't yet mean it's proven to have taken effect by this point in execution
        const firstCookie = window.document.cookie;
        expect(firstCookie).to.not.contain('token=foo');
        expect(firstCookie).to.not.contain('language=bar');

        const chrome$ = helper.padChrome$;

        // click on the settings button to make settings visible
        const $userButton = chrome$('.buttonicon-showusers');
        $userButton.click();

        const $usernameInput = chrome$('#myusernameedit');
        $usernameInput.click();

        $usernameInput.val('John McLear');
        $usernameInput.blur();

        // Before refreshing, make sure the name is there
        expect($usernameInput.val()).to.be('John McLear');

        // Now that we have a chrome, we can set a pad cookie
        // so we can confirm it gets wiped as well
        chrome$.document.cookie = 'prefsHtml=baz;expires=Thu, 01 Jan 3030 00:00:00 GMT';
        expect(chrome$.document.cookie).to.contain('prefsHtml=baz');

        // Cookies are weird. Because it's attached to chrome$ (as helper.setPadCookies does)
        // AND we didn't put path=/, we shouldn't expect it to be visible on
        // window.document.cookie. Let's just be sure.
        expect(window.document.cookie).to.not.contain('prefsHtml=baz');

        setTimeout(() => { // give it a second to save the username on the server side
          helper.newPad(() => { // get a new pad, let it clear the cookies
            const chrome$ = helper.padChrome$;

            // helper function seems to have cleared cookies
            // NOTE: this doesn't yet mean cookies were cleared effectively.
            // We still need to test below that we're in a new session
            expect(window.document.cookie).to.not.contain('token=foo');
            expect(window.document.cookie).to.not.contain('language=bar');
            expect(chrome$.document.cookie).to.contain('prefsHtml=baz');
            expect(window.document.cookie).to.not.contain('prefsHtml=baz');

            expect(window.document.cookie).to.not.be(firstCookie);

            // click on the settings button to make settings visible
            const $userButton = chrome$('.buttonicon-showusers');
            $userButton.click();

            // confirm that the session was actually cleared
            const $usernameInput = chrome$('#myusernameedit');
            expect($usernameInput.val()).to.be('');

            done();
          });
        }, 1000);
      });
    });

    it('sets pad prefs cookie', function (done) {
      this.timeout(60000);

      helper.newPad({
        padPrefs: {foo: 'bar'},
        cb() {
          const chrome$ = helper.padChrome$;
          expect(chrome$.document.cookie).to.contain('prefsHttp=%7B%22');
          expect(chrome$.document.cookie).to.contain('foo%22%3A%22bar');
          done();
        },
      });
    });
  });

  describe('the waitFor method', function () {
    it('takes a timeout and waits long enough', function (done) {
      this.timeout(2000);
      const startTime = Date.now();

      helper.waitFor(() => false, 1500).fail(() => {
        const duration = Date.now() - startTime;
        expect(duration).to.be.greaterThan(1490);
        done();
      });
    });

    it('takes an interval and checks on every interval', function (done) {
      this.timeout(4000);
      let checks = 0;

      helper.waitFor(() => {
        checks++;
        return false;
      }, 2000, 100).fail(() => {
        // One at the beginning, and 19-20 more depending on whether it's the timeout or the final
        // poll that wins at 2000ms.
        expect(checks).to.be.greaterThan(15);
        expect(checks).to.be.lessThan(24);
        done();
      });
    });

    it('rejects if the predicate throws', async function () {
      let err;
      await helper.waitFor(() => { throw new Error('test exception'); })
          .fail(() => {}) // Suppress the redundant uncatchable exception.
          .catch((e) => { err = e; });
      expect(err).to.be.an(Error);
      expect(err.message).to.be('test exception');
    });

    describe('returns a deferred object', function () {
      it('it calls done after success', function (done) {
        helper.waitFor(() => true).done(() => {
          done();
        });
      });

      it('calls fail after failure', function (done) {
        helper.waitFor(() => false, 0).fail(() => {
          done();
        });
      });

      xit("throws if you don't listen for fails", function (done) {
        const onerror = window.onerror;
        window.onerror = function () {
          window.onerror = onerror;
          done();
        };

        helper.waitFor(() => false, 100);
      });
    });

    describe('checks first then sleeps', function () {
      it('resolves quickly if the predicate is immediately true', async function () {
        const before = Date.now();
        await helper.waitFor(() => true, 1000, 900);
        expect(Date.now() - before).to.be.lessThan(800);
      });

      it('polls exactly once if timeout < interval', async function () {
        let calls = 0;
        await helper.waitFor(() => { calls++; }, 1, 1000)
            .fail(() => {}) // Suppress the redundant uncatchable exception.
            .catch(() => {}); // Don't throw an exception -- we know it rejects.
        expect(calls).to.be(1);
      });

      it('resolves if condition is immediately true even if timeout is 0', async function () {
        await helper.waitFor(() => true, 0);
      });
    });

    it('accepts async functions', async function () {
      await helper.waitFor(async () => true).fail(() => {});
      // Make sure it checks the truthiness of the Promise's resolved value, not the truthiness of
      // the Promise itself (a Promise is always truthy).
      let ok = false;
      try {
        await helper.waitFor(async () => false, 0).fail(() => {});
      } catch (err) {
        ok = true;
      }
      expect(ok).to.be(true);
    });
  });

  describe('the waitForPromise method', function () {
    it('returns a Promise', async function () {
      expect(helper.waitForPromise(() => true)).to.be.a(Promise);
    });

    it('takes a timeout and waits long enough', async function () {
      this.timeout(2000);
      const startTime = Date.now();
      let rejected;
      await helper.waitForPromise(() => false, 1500)
          .catch(() => { rejected = true; });
      expect(rejected).to.be(true);
      const duration = Date.now() - startTime;
      expect(duration).to.be.greaterThan(1490);
    });

    it('takes an interval and checks on every interval', async function () {
      this.timeout(4000);
      let checks = 0;
      let rejected;
      await helper.waitForPromise(() => { checks++; return false; }, 2000, 100)
          .catch(() => { rejected = true; });
      expect(rejected).to.be(true);
      // `checks` is expected to be 20 or 21: one at the beginning, plus 19 or 20 more depending on
      // whether it's the timeout or the final poll that wins at 2000ms. Margin is added to reduce
      // flakiness on slow test machines.
      expect(checks).to.be.greaterThan(15);
      expect(checks).to.be.lessThan(24);
    });
  });

  describe('the selectLines method', function () {
    // function to support tests, use a single way to represent whitespaces
    const cleanText = function (text) {
      return text
      // IE replaces line breaks with a whitespace, so we need to unify its behavior
      // for other browsers, to have all tests running for all browsers
          .replace(/\n/gi, '')
          .replace(/\s/gi, ' ');
    };

    before(function (done) {
      helper.newPad(() => {
        // create some lines to be used on the tests
        const $firstLine = helper.padInner$('div').first();
        $firstLine.sendkeys('{selectall}some{enter}short{enter}lines{enter}to test{enter}{enter}');

        // wait for lines to be split
        helper.waitFor(() => {
          const $fourthLine = helper.padInner$('div').eq(3);
          return $fourthLine.text() === 'to test';
        }).done(done);
      });

      this.timeout(60000);
    });

    it('changes editor selection to be between startOffset of $startLine ' +
        'and endOffset of $endLine', function (done) {
      const inner$ = helper.padInner$;

      const startOffset = 2;
      const endOffset = 4;

      const $lines = inner$('div');
      const $startLine = $lines.eq(1);
      const $endLine = $lines.eq(3);

      helper.selectLines($startLine, $endLine, startOffset, endOffset);

      const selection = inner$.document.getSelection();

      /*
       * replace() is required here because Firefox keeps the line breaks.
       *
       * I'm not sure this is ideal behavior of getSelection() where the text
       * is not consistent between browsers but that's the situation so that's
       * how I'm covering it in this test.
       */
      expect(cleanText(selection.toString().replace(/(\r\n|\n|\r)/gm, ''))).to.be('ort lines to t');

      done();
    });

    it('ends selection at beginning of $endLine when it is an empty line', function (done) {
      const inner$ = helper.padInner$;

      const startOffset = 2;
      const endOffset = 1;

      const $lines = inner$('div');
      const $startLine = $lines.eq(1);
      const $endLine = $lines.eq(4);

      helper.selectLines($startLine, $endLine, startOffset, endOffset);

      const selection = inner$.document.getSelection();

      /*
       * replace() is required here because Firefox keeps the line breaks.
       *
       * I'm not sure this is ideal behavior of getSelection() where the text
       * is not consistent between browsers but that's the situation so that's
       * how I'm covering it in this test.
       */
      expect(cleanText(
          selection.toString().replace(/(\r\n|\n|\r)/gm, ''))).to.be('ort lines to test');

      done();
    });

    it('ends selection at beginning of $endLine when its offset is zero', function (done) {
      const inner$ = helper.padInner$;

      const startOffset = 2;
      const endOffset = 0;

      const $lines = inner$('div');
      const $startLine = $lines.eq(1);
      const $endLine = $lines.eq(3);

      helper.selectLines($startLine, $endLine, startOffset, endOffset);

      const selection = inner$.document.getSelection();

      /*
       * replace() is required here because Firefox keeps the line breaks.
       *
       * I'm not sure this is ideal behavior of getSelection() where the text
       * is not consistent between browsers but that's the situation so that's
       * how I'm covering it in this test.
       */
      expect(cleanText(selection.toString().replace(/(\r\n|\n|\r)/gm, ''))).to.be('ort lines ');

      done();
    });

    it('selects full line when offset is longer than line content', function (done) {
      const inner$ = helper.padInner$;

      const startOffset = 2;
      const endOffset = 50;

      const $lines = inner$('div');
      const $startLine = $lines.eq(1);
      const $endLine = $lines.eq(3);

      helper.selectLines($startLine, $endLine, startOffset, endOffset);

      const selection = inner$.document.getSelection();

      /*
       * replace() is required here because Firefox keeps the line breaks.
       *
       * I'm not sure this is ideal behavior of getSelection() where the text
       * is not consistent between browsers but that's the situation so that's
       * how I'm covering it in this test.
       */
      expect(cleanText(
          selection.toString().replace(/(\r\n|\n|\r)/gm, ''))).to.be('ort lines to test');

      done();
    });

    it('selects all text between beginning of $startLine and end of $endLine ' +
        'when no offset is provided', function (done) {
      const inner$ = helper.padInner$;

      const $lines = inner$('div');
      const $startLine = $lines.eq(1);
      const $endLine = $lines.eq(3);

      helper.selectLines($startLine, $endLine);

      const selection = inner$.document.getSelection();

      /*
       * replace() is required here because Firefox keeps the line breaks.
       *
       * I'm not sure this is ideal behavior of getSelection() where the text
       * is not consistent between browsers but that's the situation so that's
       * how I'm covering it in this test.
       */
      expect(cleanText(
          selection.toString().replace(/(\r\n|\n|\r)/gm, ''))).to.be('short lines to test');

      done();
    });
  });

  describe('helper', function () {
    before(function (cb) {
      helper.newPad(() => {
        cb();
      });
    });

    it('.textLines() returns the text of the pad as strings', async function () {
      const lines = helper.textLines();
      const defaultText = helper.defaultText();
      expect(Array.isArray(lines)).to.be(true);
      expect(lines[0]).to.be.an('string');
      // @todo
      // final "\n" is added automatically, but my understanding is this should happen
      // only when the default text does not end with "\n" already
      expect(`${lines.join('\n')}\n`).to.equal(defaultText);
    });

    it('.linesDiv() returns the text of the pad as div elements', async function () {
      const lines = helper.linesDiv();
      const defaultText = helper.defaultText();
      expect(Array.isArray(lines)).to.be(true);
      expect(lines[0]).to.be.an('object');
      expect(lines[0].text()).to.be.an('string');
      _.each(defaultText.split('\n'), (line, index) => {
        // last line of default text
        if (index === lines.length) {
          expect(line).to.equal('');
        } else {
          expect(lines[index].text()).to.equal(line);
        }
      });
    });

    it('.edit() defaults to send an edit to the first line', async function () {
      const firstLine = helper.textLines()[0];
      await helper.edit('line');
      expect(helper.textLines()[0]).to.be(`line${firstLine}`);
    });

    it('.edit() to the line specified with parameter lineNo', async function () {
      const firstLine = helper.textLines()[0];
      await helper.edit('second line', 2);

      const text = helper.textLines();
      expect(text[0]).to.equal(firstLine);
      expect(text[1]).to.equal('second line');
    });

    it('.edit() supports sendkeys syntax ({selectall},{del},{enter})', async function () {
      expect(helper.textLines()[0]).to.not.equal('');

      // select first line
      helper.linesDiv()[0].sendkeys('{selectall}');
      // delete first line
      await helper.edit('{del}');

      expect(helper.textLines()[0]).to.be('');
      const noOfLines = helper.textLines().length;
      await helper.edit('{enter}');
      expect(helper.textLines().length).to.be(noOfLines + 1);
    });
  });
});
