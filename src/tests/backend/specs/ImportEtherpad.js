'use strict';

const assert = require('assert').strict;
const authorManager = require('../../../node/db/AuthorManager');
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
});
