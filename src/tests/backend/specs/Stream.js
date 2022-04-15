'use strict';

const Stream = require('../../../node/utils/Stream');
const assert = require('assert').strict;

class DemoIterable {
  constructor() {
    this.value = 0;
    this.errs = [];
    this.rets = [];
  }

  completed() { return this.errs.length > 0 || this.rets.length > 0; }

  next() {
    if (this.completed()) return {value: undefined, done: true}; // Mimic standard generators.
    return {value: this.value++, done: false};
  }

  throw(err) {
    const alreadyCompleted = this.completed();
    this.errs.push(err);
    if (alreadyCompleted) throw err; // Mimic standard generator objects.
    throw err;
  }

  return(ret) {
    const alreadyCompleted = this.completed();
    this.rets.push(ret);
    if (alreadyCompleted) return {value: ret, done: true}; // Mimic standard generator objects.
    return {value: ret, done: true};
  }

  [Symbol.iterator]() { return this; }
}

const assertUnhandledRejection = async (action, want) => {
  // Temporarily remove unhandled Promise rejection listeners so that the unhandled rejections we
  // expect to see don't trigger a test failure (or terminate node).
  const event = 'unhandledRejection';
  const listenersBackup = process.rawListeners(event);
  process.removeAllListeners(event);
  let tempListener;
  let asyncErr;
  try {
    const seenErrPromise = new Promise((resolve) => {
      tempListener = (err) => {
        assert.equal(asyncErr, undefined);
        asyncErr = err;
        resolve();
      };
    });
    process.on(event, tempListener);
    await action();
    await seenErrPromise;
  } finally {
    // Restore the original listeners.
    process.off(event, tempListener);
    for (const listener of listenersBackup) process.on(event, listener);
  }
  await assert.rejects(Promise.reject(asyncErr), want);
};

describe(__filename, function () {
  describe('basic behavior', function () {
    it('takes a generator', async function () {
      assert.deepEqual([...new Stream((function* () { yield 0; yield 1; yield 2; })())], [0, 1, 2]);
    });

    it('takes an array', async function () {
      assert.deepEqual([...new Stream([0, 1, 2])], [0, 1, 2]);
    });

    it('takes an iterator', async function () {
      assert.deepEqual([...new Stream([0, 1, 2][Symbol.iterator]())], [0, 1, 2]);
    });

    it('supports empty iterators', async function () {
      assert.deepEqual([...new Stream([])], []);
    });

    it('is resumable', async function () {
      const s = new Stream((function* () { yield 0; yield 1; yield 2; })());
      let iter = s[Symbol.iterator]();
      assert.deepEqual(iter.next(), {value: 0, done: false});
      iter = s[Symbol.iterator]();
      assert.deepEqual(iter.next(), {value: 1, done: false});
      assert.deepEqual([...s], [2]);
    });

    it('supports return value', async function () {
      const s = new Stream((function* () { yield 0; return 1; })());
      const iter = s[Symbol.iterator]();
      assert.deepEqual(iter.next(), {value: 0, done: false});
      assert.deepEqual(iter.next(), {value: 1, done: true});
    });

    it('does not start until needed', async function () {
      let lastYield = null;
      new Stream((function* () { yield lastYield = 0; })());
      // Fetching from the underlying iterator should not start until the first value is fetched
      // from the stream.
      assert.equal(lastYield, null);
    });

    it('throw is propagated', async function () {
      const underlying = new DemoIterable();
      const s = new Stream(underlying);
      const iter = s[Symbol.iterator]();
      assert.deepEqual(iter.next(), {value: 0, done: false});
      const err = new Error('injected');
      assert.throws(() => iter.throw(err), err);
      assert.equal(underlying.errs[0], err);
    });

    it('return is propagated', async function () {
      const underlying = new DemoIterable();
      const s = new Stream(underlying);
      const iter = s[Symbol.iterator]();
      assert.deepEqual(iter.next(), {value: 0, done: false});
      assert.deepEqual(iter.return(42), {value: 42, done: true});
      assert.equal(underlying.rets[0], 42);
    });
  });

  describe('range', function () {
    it('basic', async function () {
      assert.deepEqual([...Stream.range(0, 3)], [0, 1, 2]);
    });

    it('empty', async function () {
      assert.deepEqual([...Stream.range(0, 0)], []);
    });

    it('positive start', async function () {
      assert.deepEqual([...Stream.range(3, 5)], [3, 4]);
    });

    it('negative start', async function () {
      assert.deepEqual([...Stream.range(-3, 0)], [-3, -2, -1]);
    });

    it('end before start', async function () {
      assert.deepEqual([...Stream.range(3, 0)], []);
    });
  });

  describe('batch', function () {
    it('empty', async function () {
      assert.deepEqual([...new Stream([]).batch(10)], []);
    });

    it('does not start until needed', async function () {
      let lastYield = null;
      new Stream((function* () { yield lastYield = 0; })()).batch(10);
      assert.equal(lastYield, null);
    });

    it('fewer than batch size', async function () {
      let lastYield = null;
      const values = (function* () {
        for (let i = 0; i < 5; i++) yield lastYield = i;
      })();
      const s = new Stream(values).batch(10);
      assert.equal(lastYield, null);
      assert.deepEqual(s[Symbol.iterator]().next(), {value: 0, done: false});
      assert.equal(lastYield, 4);
      assert.deepEqual([...s], [1, 2, 3, 4]);
      assert.equal(lastYield, 4);
    });

    it('exactly batch size', async function () {
      let lastYield = null;
      const values = (function* () {
        for (let i = 0; i < 5; i++) yield lastYield = i;
      })();
      const s = new Stream(values).batch(5);
      assert.equal(lastYield, null);
      assert.deepEqual(s[Symbol.iterator]().next(), {value: 0, done: false});
      assert.equal(lastYield, 4);
      assert.deepEqual([...s], [1, 2, 3, 4]);
      assert.equal(lastYield, 4);
    });

    it('multiple batches, last batch is not full', async function () {
      let lastYield = null;
      const values = (function* () {
        for (let i = 0; i < 10; i++) yield lastYield = i;
      })();
      const s = new Stream(values).batch(3);
      assert.equal(lastYield, null);
      const iter = s[Symbol.iterator]();
      assert.deepEqual(iter.next(), {value: 0, done: false});
      assert.equal(lastYield, 2);
      assert.deepEqual(iter.next(), {value: 1, done: false});
      assert.deepEqual(iter.next(), {value: 2, done: false});
      assert.equal(lastYield, 2);
      assert.deepEqual(iter.next(), {value: 3, done: false});
      assert.equal(lastYield, 5);
      assert.deepEqual([...s], [4, 5, 6, 7, 8, 9]);
      assert.equal(lastYield, 9);
    });

    it('batched Promise rejections are suppressed while iterating', async function () {
      let lastYield = null;
      const err = new Error('injected');
      const values = (function* () {
        lastYield = 'promise of 0';
        yield new Promise((resolve) => setTimeout(() => resolve(0), 100));
        lastYield = 'rejected Promise';
        yield Promise.reject(err);
        lastYield = 'promise of 2';
        yield Promise.resolve(2);
      })();
      const s = new Stream(values).batch(3);
      const iter = s[Symbol.iterator]();
      const nextp = iter.next().value;
      assert.equal(lastYield, 'promise of 2');
      assert.equal(await nextp, 0);
      await assert.rejects(iter.next().value, err);
      iter.return();
    });

    it('batched Promise rejections are unsuppressed when iteration completes', async function () {
      let lastYield = null;
      const err = new Error('injected');
      const values = (function* () {
        lastYield = 'promise of 0';
        yield new Promise((resolve) => setTimeout(() => resolve(0), 100));
        lastYield = 'rejected Promise';
        yield Promise.reject(err);
        lastYield = 'promise of 2';
        yield Promise.resolve(2);
      })();
      const s = new Stream(values).batch(3);
      const iter = s[Symbol.iterator]();
      assert.equal(await iter.next().value, 0);
      assert.equal(lastYield, 'promise of 2');
      await assertUnhandledRejection(() => iter.return(), err);
    });
  });

  describe('buffer', function () {
    it('empty', async function () {
      assert.deepEqual([...new Stream([]).buffer(10)], []);
    });

    it('does not start until needed', async function () {
      let lastYield = null;
      new Stream((function* () { yield lastYield = 0; })()).buffer(10);
      assert.equal(lastYield, null);
    });

    it('fewer than buffer size', async function () {
      let lastYield = null;
      const values = (function* () {
        for (let i = 0; i < 5; i++) yield lastYield = i;
      })();
      const s = new Stream(values).buffer(10);
      assert.equal(lastYield, null);
      assert.deepEqual(s[Symbol.iterator]().next(), {value: 0, done: false});
      assert.equal(lastYield, 4);
      assert.deepEqual([...s], [1, 2, 3, 4]);
      assert.equal(lastYield, 4);
    });

    it('exactly buffer size', async function () {
      let lastYield = null;
      const values = (function* () {
        for (let i = 0; i < 5; i++) yield lastYield = i;
      })();
      const s = new Stream(values).buffer(5);
      assert.equal(lastYield, null);
      assert.deepEqual(s[Symbol.iterator]().next(), {value: 0, done: false});
      assert.equal(lastYield, 4);
      assert.deepEqual([...s], [1, 2, 3, 4]);
      assert.equal(lastYield, 4);
    });

    it('more than buffer size', async function () {
      let lastYield = null;
      const values = (function* () {
        for (let i = 0; i < 10; i++) yield lastYield = i;
      })();
      const s = new Stream(values).buffer(3);
      assert.equal(lastYield, null);
      const iter = s[Symbol.iterator]();
      assert.deepEqual(iter.next(), {value: 0, done: false});
      assert.equal(lastYield, 3);
      assert.deepEqual(iter.next(), {value: 1, done: false});
      assert.equal(lastYield, 4);
      assert.deepEqual(iter.next(), {value: 2, done: false});
      assert.equal(lastYield, 5);
      assert.deepEqual([...s], [3, 4, 5, 6, 7, 8, 9]);
      assert.equal(lastYield, 9);
    });

    it('buffered Promise rejections are suppressed while iterating', async function () {
      let lastYield = null;
      const err = new Error('injected');
      const values = (function* () {
        lastYield = 'promise of 0';
        yield new Promise((resolve) => setTimeout(() => resolve(0), 100));
        lastYield = 'rejected Promise';
        yield Promise.reject(err);
        lastYield = 'promise of 2';
        yield Promise.resolve(2);
      })();
      const s = new Stream(values).buffer(3);
      const iter = s[Symbol.iterator]();
      const nextp = iter.next().value;
      assert.equal(lastYield, 'promise of 2');
      assert.equal(await nextp, 0);
      await assert.rejects(iter.next().value, err);
      iter.return();
    });

    it('buffered Promise rejections are unsuppressed when iteration completes', async function () {
      let lastYield = null;
      const err = new Error('injected');
      const values = (function* () {
        lastYield = 'promise of 0';
        yield new Promise((resolve) => setTimeout(() => resolve(0), 100));
        lastYield = 'rejected Promise';
        yield Promise.reject(err);
        lastYield = 'promise of 2';
        yield Promise.resolve(2);
      })();
      const s = new Stream(values).buffer(3);
      const iter = s[Symbol.iterator]();
      assert.equal(await iter.next().value, 0);
      assert.equal(lastYield, 'promise of 2');
      await assertUnhandledRejection(() => iter.return(), err);
    });
  });

  describe('map', function () {
    it('empty', async function () {
      let called = false;
      assert.deepEqual([...new Stream([]).map((v) => called = true)], []);
      assert.equal(called, false);
    });

    it('does not start until needed', async function () {
      let called = false;
      assert.deepEqual([...new Stream([]).map((v) => called = true)], []);
      new Stream((function* () { yield 0; })()).map((v) => called = true);
      assert.equal(called, false);
    });

    it('works', async function () {
      const calls = [];
      assert.deepEqual(
          [...new Stream([0, 1, 2]).map((v) => { calls.push(v); return 2 * v; })], [0, 2, 4]);
      assert.deepEqual(calls, [0, 1, 2]);
    });
  });
});
