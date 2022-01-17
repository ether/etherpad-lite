'use strict';

const SessionStore = require('../../../node/db/SessionStore');
const assert = require('assert').strict;
const common = require('../common');
const db = require('../../../node/db/DB');
const util = require('util');

describe(__filename, function () {
  let ss;
  let sid;

  const set = async (sess) => await util.promisify(ss.set).call(ss, sid, sess);
  const get = async () => await util.promisify(ss.get).call(ss, sid);
  const destroy = async () => await util.promisify(ss.destroy).call(ss, sid);

  before(async function () {
    await common.init();
  });

  beforeEach(async function () {
    ss = new SessionStore();
    sid = common.randomString();
  });

  afterEach(async function () {
    if (ss != null && sid != null) await destroy();
    sid = null;
    ss = null;
  });

  describe('set', function () {
    it('set of null is a no-op', async function () {
      await set(null);
      assert(await db.get(`sessionstorage:${sid}`) == null);
    });

    it('set of non-expiring session', async function () {
      const sess = {foo: 'bar', baz: {asdf: 'jkl;'}};
      await set(sess);
      assert.equal(JSON.stringify(await db.get(`sessionstorage:${sid}`)), JSON.stringify(sess));
    });

    it('set of session that expires', async function () {
      const sess = {foo: 'bar', cookie: {expires: new Date(Date.now() + 100)}};
      await set(sess);
      assert.equal(JSON.stringify(await db.get(`sessionstorage:${sid}`)), JSON.stringify(sess));
    });

    it('set of already expired session', async function () {
      const sess = {foo: 'bar', cookie: {expires: new Date(1)}};
      await set(sess);
      // No record should have been created.
      assert(await db.get(`sessionstorage:${sid}`) == null);
    });
  });

  describe('get', function () {
    it('get of non-existent entry', async function () {
      assert(await get() == null);
    });

    it('set+get round trip', async function () {
      const sess = {foo: 'bar', baz: {asdf: 'jkl;'}};
      await set(sess);
      assert.equal(JSON.stringify(await get()), JSON.stringify(sess));
    });

    it('get of record from previous run (no expiration)', async function () {
      const sess = {foo: 'bar', baz: {asdf: 'jkl;'}};
      await db.set(`sessionstorage:${sid}`, sess);
      assert.equal(JSON.stringify(await get()), JSON.stringify(sess));
    });

    it('get of record from previous run (not yet expired)', async function () {
      const sess = {foo: 'bar', cookie: {expires: new Date(Date.now() + 100)}};
      await db.set(`sessionstorage:${sid}`, sess);
      assert.equal(JSON.stringify(await get()), JSON.stringify(sess));
    });

    it('get of record from previous run (already expired)', async function () {
      const sess = {foo: 'bar', cookie: {expires: new Date(1)}};
      await db.set(`sessionstorage:${sid}`, sess);
      assert(await get() == null);
      assert(await db.get(`sessionstorage:${sid}`) == null);
    });

    it('external expiration update is picked up', async function () {
      const sess = {foo: 'bar', cookie: {expires: new Date(Date.now() + 100)}};
      await set(sess);
      assert.equal(JSON.stringify(await get()), JSON.stringify(sess));
      const sess2 = {...sess, cookie: {expires: new Date(Date.now() + 200)}};
      await db.set(`sessionstorage:${sid}`, sess2);
      assert.equal(JSON.stringify(await get()), JSON.stringify(sess2));
      await new Promise((resolve) => setTimeout(resolve, 110));
      // The original timeout should not have fired.
      assert.equal(JSON.stringify(await get()), JSON.stringify(sess2));
    });
  });

  describe('destroy', function () {
    it('destroy deletes the database record', async function () {
      const sess = {cookie: {expires: new Date(Date.now() + 100)}};
      await set(sess);
      await destroy();
      assert(await db.get(`sessionstorage:${sid}`) == null);
    });

    it('destroy cancels the timeout', async function () {
      const sess = {cookie: {expires: new Date(Date.now() + 100)}};
      await set(sess);
      await destroy();
      await db.set(`sessionstorage:${sid}`, sess);
      await new Promise((resolve) => setTimeout(resolve, 110));
      assert.equal(JSON.stringify(await db.get(`sessionstorage:${sid}`)), JSON.stringify(sess));
    });

    it('destroy session that does not exist', async function () {
      await destroy();
    });
  });
});
