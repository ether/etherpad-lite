'use strict';

describe('performance', function () {
  beforeEach(function (cb) {
    helper.newPad(cb);
  });

  // Etherpad core should never provide more than 30 files.
  it('correct number of files are provided to browser from Etherpad', async function () {
    await helper.waitForPromise(() => performance.getEntriesByType('resource').length <= 30);
  });
});
