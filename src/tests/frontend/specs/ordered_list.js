'use strict';

describe('ordered_list.js', function () {
  describe('assign ordered list', function () {
    // create a new pad before each test run
    beforeEach(async function () {
      await helper.aNewPad();
    });

    it('inserts ordered list text', async function () {
      const inner$ = helper.padInner$;
      const chrome$ = helper.padChrome$;

      const $insertorderedlistButton = chrome$('.buttonicon-insertorderedlist');
      $insertorderedlistButton.click();

      await helper.waitForPromise(() => inner$('div').first().find('ol li').length === 1);
    });

    context('when user presses Ctrl+Shift+N', function () {
      context('and pad shortcut is enabled', function () {
        beforeEach(async function () {
          const originalHTML = helper.padInner$('body').html();
          makeSureShortcutIsEnabled('cmdShiftN');
          triggerCtrlShiftShortcut('N');
          await helper.waitForPromise(() => helper.padInner$('body').html() !== originalHTML);
        });

        it('inserts unordered list', async function () {
          await helper.waitForPromise(
              () => helper.padInner$('div').first().find('ol li').length === 1);
        });
      });

      context('and pad shortcut is disabled', function () {
        beforeEach(async function () {
          const originalHTML = helper.padInner$('body').html();
          makeSureShortcutIsDisabled('cmdShiftN');
          triggerCtrlShiftShortcut('N');
          try {
            // The HTML should not change. Briefly wait for it to change and fail if it does change.
            await helper.waitForPromise(
                () => helper.padInner$('body').html() !== originalHTML, 500);
          } catch (err) {
            // We want the test to pass if the above wait timed out. (If it timed out that
            // means the HTML never changed, which is a good thing.)
            // TODO: Re-throw non-"condition never became true" errors to avoid false positives.
          }
          // This will fail if the above `waitForPromise()` succeeded.
          expect(helper.padInner$('body').html()).to.be(originalHTML);
        });

        it('does not insert unordered list', async function () {
          this.timeout(3000);
          try {
            await helper.waitForPromise(
                () => helper.padInner$('div').first().find('ol li').length === 1);
          } catch (err) {
            return;
          }
          expect().fail('Unordered list inserted, should ignore shortcut');
        });
      });
    });

    context('when user presses Ctrl+Shift+1', function () {
      context('and pad shortcut is enabled', function () {
        beforeEach(async function () {
          const originalHTML = helper.padInner$('body').html();
          makeSureShortcutIsEnabled('cmdShift1');
          triggerCtrlShiftShortcut('1');
          await helper.waitForPromise(() => helper.padInner$('body').html() !== originalHTML);
        });

        it('inserts unordered list', async function () {
          helper.waitForPromise(() => helper.padInner$('div').first().find('ol li').length === 1);
        });
      });

      context('and pad shortcut is disabled', function () {
        beforeEach(async function () {
          const originalHTML = helper.padInner$('body').html();
          makeSureShortcutIsDisabled('cmdShift1');
          triggerCtrlShiftShortcut('1');
          try {
            // The HTML should not change. Briefly wait for it to change and fail if it does change.
            await helper.waitForPromise(
                () => helper.padInner$('body').html() !== originalHTML, 500);
          } catch (err) {
            // We want the test to pass if the above wait timed out. (If it timed out that
            // means the HTML never changed, which is a good thing.)
            // TODO: Re-throw non-"condition never became true" errors to avoid false positives.
          }
          // This will fail if the above `waitForPromise()` succeeded.
          expect(helper.padInner$('body').html()).to.be(originalHTML);
        });

        it('does not insert unordered list', async function () {
          this.timeout(3000);
          try {
            await helper.waitForPromise(
                () => helper.padInner$('div').first().find('ol li').length === 1);
          } catch (err) {
            return;
          }
          expect().fail('Unordered list inserted, should ignore shortcut');
        });
      });
    });

    it('issue #4748 keeps numbers increment on OL', async function () {
      this.timeout(5000);
      const inner$ = helper.padInner$;
      const chrome$ = helper.padChrome$;
      const $insertorderedlistButton = chrome$('.buttonicon-insertorderedlist');
      const $firstLine = inner$('div').first();
      $firstLine.sendkeys('{selectall}');
      $insertorderedlistButton.click();
      const $secondLine = inner$('div').first().next();
      $secondLine.sendkeys('{selectall}');
      $insertorderedlistButton.click();
      expect($secondLine.find('ol').attr('start') === 2);
    });

    xit('issue #1125 keeps the numbered list on enter for the new line', async function () {
      // EMULATES PASTING INTO A PAD
      const inner$ = helper.padInner$;
      const chrome$ = helper.padChrome$;

      const $insertorderedlistButton = chrome$('.buttonicon-insertorderedlist');
      $insertorderedlistButton.click();

      // type a bit, make a line break and type again
      const $firstTextElement = inner$('div span').first();
      $firstTextElement.sendkeys('line 1');
      $firstTextElement.sendkeys('{enter}');
      $firstTextElement.sendkeys('line 2');
      $firstTextElement.sendkeys('{enter}');

      await helper.waitForPromise(() => inner$('div span').first().text().indexOf('line 2') === -1);

      const $newSecondLine = inner$('div').first().next();
      const hasOLElement = $newSecondLine.find('ol li').length === 1;
      expect(hasOLElement).to.be(true);
      expect($newSecondLine.text()).to.be('line 2');
      const hasLineNumber = $newSecondLine.find('ol').attr('start') === 2;
      // This doesn't work because pasting in content doesn't work
      expect(hasLineNumber).to.be(true);
    });

    const triggerCtrlShiftShortcut = (shortcutChar) => {
      const inner$ = helper.padInner$;
      const e = new inner$.Event(helper.evtType);
      e.ctrlKey = true;
      e.shiftKey = true;
      e.which = shortcutChar.toString().charCodeAt(0);
      inner$('#innerdocbody').trigger(e);
    };

    const makeSureShortcutIsDisabled = (shortcut) => {
      helper.padChrome$.window.clientVars.padShortcutEnabled[shortcut] = false;
    };
    const makeSureShortcutIsEnabled = (shortcut) => {
      helper.padChrome$.window.clientVars.padShortcutEnabled[shortcut] = true;
    };
  });

  describe('Pressing Tab in an OL increases and decreases indentation', function () {
    // create a new pad before each test run
    beforeEach(async function () {
      await helper.aNewPad();
    });

    it('indent and de-indent list item with keypress', async function () {
      const inner$ = helper.padInner$;
      const chrome$ = helper.padChrome$;

      // get the first text element out of the inner iframe
      const $firstTextElement = inner$('div').first();

      // select this text element
      $firstTextElement.sendkeys('{selectall}');

      const $insertorderedlistButton = chrome$('.buttonicon-insertorderedlist');
      $insertorderedlistButton.click();

      const e = new inner$.Event(helper.evtType);
      e.keyCode = 9; // tab
      inner$('#innerdocbody').trigger(e);

      expect(inner$('div').first().find('.list-number2').length === 1).to.be(true);
      e.shiftKey = true; // shift
      e.keyCode = 9; // tab
      inner$('#innerdocbody').trigger(e);

      await helper.waitForPromise(() => inner$('div').first().find('.list-number1').length === 1);
    });
  });


  describe('Pressing indent/outdent button in an OL increases and ' +
      'decreases indentation and bullet / ol formatting', function () {
    // create a new pad before each test run
    beforeEach(async function () {
      await helper.aNewPad();
    });

    it('indent and de-indent list item with indent button', async function () {
      this.timeout(1000);
      const inner$ = helper.padInner$;
      const chrome$ = helper.padChrome$;

      // get the first text element out of the inner iframe
      const $firstTextElement = inner$('div').first();

      // select this text element
      $firstTextElement.sendkeys('{selectall}');

      const $insertorderedlistButton = chrome$('.buttonicon-insertorderedlist');
      $insertorderedlistButton.click();

      const $indentButton = chrome$('.buttonicon-indent');
      $indentButton.click(); // make it indented twice

      expect(inner$('div').first().find('.list-number2').length === 1).to.be(true);

      const $outdentButton = chrome$('.buttonicon-outdent');
      $outdentButton.click(); // make it deindented to 1

      await helper.waitForPromise(() => inner$('div').first().find('.list-number1').length === 1);
    });
  });
});
