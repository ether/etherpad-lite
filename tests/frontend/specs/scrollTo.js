'use strict';

describe('scrolls to line', function () {
  // create a new pad with URL hash set before each test run
  beforeEach(function (cb) {
    helper.newPad({
      hash: 'L4',
      cb,
    });
    this.timeout(10000);
  });

  it('Scrolls down to Line 4', function (done) {
    this.timeout(10000);
    const chrome$ = helper.padChrome$;
    helper.waitFor(() => {
      const topOffset = parseInt(chrome$('iframe').first('iframe')
          .contents().find('#outerdocbody').css('top'));
      return (topOffset >= 100);
    });
    done();
  });
});

describe('doesnt break on weird hash input', function () {
  // create a new pad with URL hash set before each test run
  beforeEach(function (cb) {
    helper.newPad({
      hash: '#DEEZ123123NUTS',
      cb,
    });
    this.timeout(10000);
  });

  it('Does NOT change scroll', function (done) {
    this.timeout(10000);
    const chrome$ = helper.padChrome$;
    helper.waitFor(() => {
      const topOffset = parseInt(chrome$('iframe').first('iframe')
          .contents().find('#outerdocbody').css('top'));
      return (!topOffset); // no css top should be set.
    });
    done();
  });
});
