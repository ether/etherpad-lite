'use strict';

const AuthorManager = require('../../../node/db/AuthorManager');
const assert = require('assert').strict;
const common = require('../common');
const db = require('../../../node/db/DB');

describe(__filename, function () {
  let setBackup;

  before(async function () {
    await common.init();
    setBackup = db.set;

    db.set = async (...args) => {
      // delay db.set
      await new Promise((resolve) => { setTimeout(() => resolve(), 500); });
      return await setBackup.call(db, ...args);
    };
  });

  after(async function () {
    db.set = setBackup;
  });

  it('regression test for missing await in createAuthor (#5000)', async function () {
    this.timeout(700);
    const {authorID} = await AuthorManager.createAuthor(); // Should block until db.set() finishes.
    assert(await AuthorManager.doesAuthorExist(authorID));
  });
});
