'use strict';

describe('scrollTo.js', function () {
  describe('scrolls to line', function () {
    // create a new pad with URL hash set before each test run
    before(async function () {
      this.timeout(60000);
      await new Promise((resolve, reject) => helper.newPad({
        cb: (err) => (err != null) ? reject(err) : resolve(),
        hash: 'L4',
      }));
    });

    it('Scrolls down to Line 4', async function () {
      this.timeout(100);
      const chrome$ = helper.padChrome$;
      await helper.waitForPromise(() => {
        const topOffset = parseInt(chrome$('iframe').first('iframe')
            .contents().find('#outerdocbody').css('top'));
        return (topOffset >= 100);
      });
    });
  });

  describe('doesnt break on weird hash input', function () {
    // create a new pad with URL hash set before each test run
    before(async function () {
      this.timeout(60000);
      await new Promise((resolve, reject) => helper.newPad({
        cb: (err) => (err != null) ? reject(err) : resolve(),
        hash: '#DEEZ123123NUTS',
      }));
    });

    it('Does NOT change scroll', async function () {
      this.timeout(100);
      const chrome$ = helper.padChrome$;
      await helper.waitForPromise(() => {
        const topOffset = parseInt(chrome$('iframe').first('iframe')
            .contents().find('#outerdocbody').css('top'));
        return (!topOffset); // no css top should be set.
      });
    });
  });
});
