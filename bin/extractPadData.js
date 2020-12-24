'use strict';

/*
 * This is a debug tool. It helps to extract all datas of a pad and move it from
 * a productive environment and to a develop environment to reproduce bugs
 * there. It outputs a dirtydb file
 */

if (process.argv.length !== 3) {
  console.error('Use: node extractPadData.js $PADID');
  throw new Error();
}

// get the padID
const padId = process.argv[2];

const npm = require(`${__dirname}/../src/node_modules/npm`);

npm.load({}, async (er) => {
  if (er) {
    console.error(`Could not load NPM: ${er}`);
    throw new Error();
  }

  try {
    // initialize database
    require('../src/node/utils/Settings');
    const db = require('../src/node/db/DB');
    await db.init();

    // load extra modules
    const dirtyDB = require(`${__dirname}/../src/node_modules/dirty`);
    const padManager = require('../src/node/db/PadManager');
    const util = require('util');

    // initialize output database
    const dirty = dirtyDB(`${padId}.db`);

    // Promise wrapped get and set function
    const wrapped = db.db.db.wrappedDB;
    const get = util.promisify(wrapped.get.bind(wrapped));
    const set = util.promisify(dirty.set.bind(dirty));

    // array in which required key values will be accumulated
    const neededDBValues = [`pad:${padId}`];

    // get the actual pad object
    const pad = await padManager.getPad(padId);

    // add all authors
    neededDBValues.push(...pad.getAllAuthors().map((author) => `globalAuthor:${author}`));

    // add all revisions
    for (let rev = 0; rev <= pad.head; ++rev) {
      neededDBValues.push(`pad:${padId}:revs:${rev}`);
    }

    // add all chat values
    for (let chat = 0; chat <= pad.chatHead; ++chat) {
      neededDBValues.push(`pad:${padId}:chat:${chat}`);
    }

    for (const dbkey of neededDBValues) {
      let dbvalue = await get(dbkey);
      if (dbvalue && typeof dbvalue !== 'object') {
        dbvalue = JSON.parse(dbvalue);
      }
      await set(dbkey, dbvalue);
    }

    console.log('finished');
  } catch (er) {
    console.error(er);
    throw new Error();
  }
});
