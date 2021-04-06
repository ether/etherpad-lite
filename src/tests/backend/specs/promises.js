const assert = require('assert').strict;
const promises = require('../../../node/utils/promises');

describe(__filename, function () {
  describe('promises.timesLimit', function () {
    let wantIndex = 0;
    const testPromises = [];
    const makePromise = (index) => {
      // Make sure index increases by one each time.
      assert.equal(index, wantIndex++);
      // Save the resolve callback (so the test can trigger resolution)
      // and the promise itself (to wait for resolve to take effect).
      const p = {};
      const promise = new Promise((resolve) => {
        p.resolve = resolve;
      });
      p.promise = promise;
      testPromises.push(p);
      return p.promise;
    };

    const total = 11;
    const concurrency = 7;
    const timesLimitPromise = promises.timesLimit(total, concurrency, makePromise);

    it('honors concurrency', async function () {
      assert.equal(wantIndex, concurrency);
    });

    it('creates another when one completes', async function () {
      const {promise, resolve} = testPromises.shift();
      resolve();
      await promise;
      assert.equal(wantIndex, concurrency + 1);
    });

    it('creates the expected total number of promises', async function () {
      while (testPromises.length > 0) {
        // Resolve them in random order to ensure that the resolution order doesn't matter.
        const i = Math.floor(Math.random() * Math.floor(testPromises.length));
        const {promise, resolve} = testPromises.splice(i, 1)[0];
        resolve();
        await promise;
      }
      assert.equal(wantIndex, total);
    });

    it('resolves', async function () {
      await timesLimitPromise;
    });

    it('does not create too many promises if total < concurrency', async function () {
      wantIndex = 0;
      assert.equal(testPromises.length, 0);
      const total = 7;
      const concurrency = 11;
      const timesLimitPromise = promises.timesLimit(total, concurrency, makePromise);
      while (testPromises.length > 0) {
        const {promise, resolve} = testPromises.pop();
        resolve();
        await promise;
      }
      await timesLimitPromise;
      assert.equal(wantIndex, total);
    });

    it('accepts total === 0, concurrency > 0', async function () {
      wantIndex = 0;
      assert.equal(testPromises.length, 0);
      await promises.timesLimit(0, concurrency, makePromise);
      assert.equal(wantIndex, 0);
    });

    it('accepts total === 0, concurrency === 0', async function () {
      wantIndex = 0;
      assert.equal(testPromises.length, 0);
      await promises.timesLimit(0, 0, makePromise);
      assert.equal(wantIndex, 0);
    });

    it('rejects total > 0, concurrency === 0', async function () {
      await assert.rejects(promises.timesLimit(total, 0, makePromise), RangeError);
    });
  });
});
