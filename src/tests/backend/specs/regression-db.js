import * as AuthorManager from "../../../node/db/AuthorManager.js";
import assert$0 from "assert";
import * as common from "../common.js";
import * as db from "../../../node/db/DB.js";
'use strict';
const assert = assert$0.strict;
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
        const { authorID } = await AuthorManager.createAuthor(); // Should block until db.set() finishes.
        assert(await AuthorManager.doesAuthorExist(authorID));
    });
});
