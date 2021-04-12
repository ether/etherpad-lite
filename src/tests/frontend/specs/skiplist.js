'use strict';

const SkipList = require('ep_etherpad-lite/static/js/skiplist');

describe('skiplist.js', function () {
  it('rejects null keys', async function () {
    const skiplist = new SkipList();
    for (const key of [undefined, null]) {
      expect(() => skiplist.push({key})).to.throwError();
    }
  });

  it('rejects duplicate keys', async function () {
    const skiplist = new SkipList();
    skiplist.push({key: 'foo'});
    expect(() => skiplist.push({key: 'foo'})).to.throwError();
  });

  it('atOffset() returns last entry that touches offset', async function () {
    const skiplist = new SkipList();
    const entries = [];
    let nextId = 0;
    const makeEntry = (width) => {
      const entry = {key: `id${nextId++}`, width};
      entries.push(entry);
      return entry;
    };

    skiplist.push(makeEntry(5));
    expect(skiplist.atOffset(4)).to.be(entries[0]);
    expect(skiplist.atOffset(5)).to.be(entries[0]);
    expect(() => skiplist.atOffset(6)).to.throwError();

    skiplist.push(makeEntry(0));
    expect(skiplist.atOffset(4)).to.be(entries[0]);
    expect(skiplist.atOffset(5)).to.be(entries[1]);
    expect(() => skiplist.atOffset(6)).to.throwError();

    skiplist.push(makeEntry(0));
    expect(skiplist.atOffset(4)).to.be(entries[0]);
    expect(skiplist.atOffset(5)).to.be(entries[2]);
    expect(() => skiplist.atOffset(6)).to.throwError();

    skiplist.splice(2, 0, [makeEntry(0)]);
    expect(skiplist.atOffset(4)).to.be(entries[0]);
    expect(skiplist.atOffset(5)).to.be(entries[2]);
    expect(() => skiplist.atOffset(6)).to.throwError();

    skiplist.push(makeEntry(3));
    expect(skiplist.atOffset(4)).to.be(entries[0]);
    expect(skiplist.atOffset(5)).to.be(entries[4]);
    expect(skiplist.atOffset(6)).to.be(entries[4]);
  });
});
