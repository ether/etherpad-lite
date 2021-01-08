'use strict';

/*
 * This is a repair tool. It extracts all datas of a pad, removes and inserts them again.
 */

console.warn('WARNING: This script must not be used while etherpad is running!');

if (process.argv.length !== 3) throw new Error('Use: node bin/repairPad.js $PADID');

// get the padID
const padId = process.argv[2];

let valueCount = 0;

const npm = require(`${__dirname}/../src/node_modules/npm`);
npm.load({}, async (err) => {
  if (err) throw err;

  // intialize database
  require('../src/node/utils/Settings');
  const db = require('../src/node/db/DB');
  await db.init();

  // get the pad
  const padManager = require('../src/node/db/PadManager');
  const pad = await padManager.getPad(padId);

  // accumulate the required keys
  const neededDBValues = [`pad:${padId}`];

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
  // now fetch and reinsert every key
  for (const key of neededDBValues) {
    const value = await db.get(key);
    // if it isn't a globalAuthor value which we want to ignore..
    // console.log(`Key: ${key}, value: ${JSON.stringify(value)}`);
    await db.remove(key);
    await db.set(key, value);
    valueCount++;
  }

  console.info(`Finished: Replaced ${valueCount} values in the database`);
});
