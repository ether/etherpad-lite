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
});
