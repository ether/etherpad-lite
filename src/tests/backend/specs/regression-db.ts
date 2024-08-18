'use strict';

const AuthorManager = require('../../../node/db/AuthorManager');
import {strict as assert} from "assert";
import {init} from '../common';
import db from '../../../node/db/DB';

describe(__filename, function () {
  let setBackup: Function;

  before(async function () {
    await init();
    setBackup = db.set;

    db.set = async (...args:any) => {
      // delay db.set
      await new Promise<void>((resolve) => { setTimeout(() => resolve(), 500); });
      return await setBackup.call(db, ...args);
    };
  });

  after(async function () {
    db.set = setBackup as any;
  });

  it('regression test for missing await in createAuthor (#5000)', async function () {
    const {authorID} = await AuthorManager.createAuthor(); // Should block until db.set() finishes.
    assert(await AuthorManager.doesAuthorExist(authorID));
  });
});
