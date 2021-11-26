'use strict';

const assert = require('assert').strict;
const authorManager = require('../../../node/db/AuthorManager');
const db = require('../../../node/db/DB');
const importEtherpad = require('../../../node/utils/ImportEtherpad');
const padManager = require('../../../node/db/PadManager');
const {randomString} = require('../../../static/js/pad_utils');

describe(__filename, function () {
  let padId;

  const makeAuthorId = () => `a.${randomString(16)}`;

  const makeExport = (authorId) => ({
    'pad:testing': {
      atext: {
        text: 'foo\n',
        attribs: '|1+4',
      },
      pool: {
        numToAttrib: {},
        nextNum: 0,
      },
      head: 0,
      savedRevisions: [],
    },
    [`globalAuthor:${authorId}`]: {
      colorId: '#000000',
      name: 'new',
      timestamp: 1598747784631,
      padIDs: 'testing',
    },
    'pad:testing:revs:0': {
      changeset: 'Z:1>3+3$foo',
      meta: {
        author: '',
        timestamp: 1597632398288,
        pool: {
          numToAttrib: {},
          nextNum: 0,
        },
        atext: {
          text: 'foo\n',
          attribs: '|1+4',
        },
      },
    },
  });

  beforeEach(async function () {
    padId = randomString(10);
    assert(!await padManager.doesPadExist(padId));
  });

  it('unknown db records are ignored', async function () {
    const badKey = `maliciousDbKey${randomString(10)}`;
    await importEtherpad.setPadRaw(padId, JSON.stringify({
      [badKey]: 'value',
      ...makeExport(makeAuthorId()),
    }));
    assert(await db.get(badKey) == null);
  });

  it('changes are all or nothing', async function () {
    const authorId = makeAuthorId();
    const data = makeExport(authorId);
    data['pad:differentPadId:revs:0'] = data['pad:testing:revs:0'];
    delete data['pad:testing:revs:0'];
    assert.rejects(importEtherpad.setPadRaw(padId, JSON.stringify(data)), /unexpected pad ID/);
    assert(!await authorManager.doesAuthorExist(authorId));
    assert(!await padManager.doesPadExist(padId));
  });

  describe('author pad IDs', function () {
    let existingAuthorId;
    let newAuthorId;

    beforeEach(async function () {
      existingAuthorId = (await authorManager.createAuthor('existing')).authorID;
      assert(await authorManager.doesAuthorExist(existingAuthorId));
      assert.deepEqual((await authorManager.listPadsOfAuthor(existingAuthorId)).padIDs, []);
      newAuthorId = makeAuthorId();
      assert.notEqual(newAuthorId, existingAuthorId);
      assert(!await authorManager.doesAuthorExist(newAuthorId));
    });

    it('author does not yet exist', async function () {
      await importEtherpad.setPadRaw(padId, JSON.stringify(makeExport(newAuthorId)));
      assert(await authorManager.doesAuthorExist(newAuthorId));
      const author = await authorManager.getAuthor(newAuthorId);
      assert.equal(author.name, 'new');
      assert.equal(author.colorId, '#000000');
      assert.deepEqual((await authorManager.listPadsOfAuthor(newAuthorId)).padIDs, [padId]);
    });

    it('author already exists, no pads', async function () {
      newAuthorId = existingAuthorId;
      await importEtherpad.setPadRaw(padId, JSON.stringify(makeExport(newAuthorId)));
      assert(await authorManager.doesAuthorExist(newAuthorId));
      const author = await authorManager.getAuthor(newAuthorId);
      assert.equal(author.name, 'existing');
      assert.notEqual(author.colorId, '#000000');
      assert.deepEqual((await authorManager.listPadsOfAuthor(newAuthorId)).padIDs, [padId]);
    });

    it('author already exists, on different pad', async function () {
      const otherPadId = randomString(10);
      await authorManager.addPad(existingAuthorId, otherPadId);
      newAuthorId = existingAuthorId;
      await importEtherpad.setPadRaw(padId, JSON.stringify(makeExport(newAuthorId)));
      assert(await authorManager.doesAuthorExist(newAuthorId));
      const author = await authorManager.getAuthor(newAuthorId);
      assert.equal(author.name, 'existing');
      assert.notEqual(author.colorId, '#000000');
      assert.deepEqual(
          (await authorManager.listPadsOfAuthor(newAuthorId)).padIDs.sort(),
          [otherPadId, padId].sort());
    });

    it('author already exists, on same pad', async function () {
      await authorManager.addPad(existingAuthorId, padId);
      newAuthorId = existingAuthorId;
      await importEtherpad.setPadRaw(padId, JSON.stringify(makeExport(newAuthorId)));
      assert(await authorManager.doesAuthorExist(newAuthorId));
      const author = await authorManager.getAuthor(newAuthorId);
      assert.equal(author.name, 'existing');
      assert.notEqual(author.colorId, '#000000');
      assert.deepEqual((await authorManager.listPadsOfAuthor(newAuthorId)).padIDs, [padId]);
    });
  });

  describe('enforces consistent pad ID', function () {
    it('pad record has different pad ID', async function () {
      const data = makeExport(makeAuthorId());
      data['pad:differentPadId'] = data['pad:testing'];
      delete data['pad:testing'];
      assert.rejects(importEtherpad.setPadRaw(padId, JSON.stringify(data)), /unexpected pad ID/);
    });

    it('globalAuthor record has different pad ID', async function () {
      const authorId = makeAuthorId();
      const data = makeExport(authorId);
      data[`globalAuthor:${authorId}`].padIDs = 'differentPadId';
      assert.rejects(importEtherpad.setPadRaw(padId, JSON.stringify(data)), /unexpected pad ID/);
    });

    it('pad rev record has different pad ID', async function () {
      const data = makeExport(makeAuthorId());
      data['pad:differentPadId:revs:0'] = data['pad:testing:revs:0'];
      delete data['pad:testing:revs:0'];
      assert.rejects(importEtherpad.setPadRaw(padId, JSON.stringify(data)), /unexpected pad ID/);
    });
  });

  describe('order of records does not matter', function () {
    for (const perm of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
      it(JSON.stringify(perm), async function () {
        const authorId = makeAuthorId();
        const records = Object.entries(makeExport(authorId));
        assert.equal(records.length, 3);
        await importEtherpad.setPadRaw(
            padId, JSON.stringify(Object.fromEntries(perm.map((i) => records[i]))));
        assert.deepEqual((await authorManager.listPadsOfAuthor(authorId)).padIDs, [padId]);
        const pad = await padManager.getPad(padId);
        assert.equal(pad.text(), 'foo\n');
      });
    }
  });
});
