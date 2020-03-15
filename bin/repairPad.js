/*
 * This is a repair tool. It extracts all datas of a pad, removes and inserts them again.
 */

console.warn("WARNING: This script must not be used while etherpad is running!");

if (process.argv.length != 3) {
  console.error("Use: node bin/repairPad.js $PADID");
  process.exit(1);
}

// get the padID
var padId = process.argv[2];

let npm = require("../src/node_modules/npm");
npm.load({}, async function(er) {
  if (er) {
    console.error("Could not load NPM: " + er)
    process.exit(1);
  }

  try {
    // intialize database
    let settings = require('../src/node/utils/Settings');
    let db = require('../src/node/db/DB');
    await db.init();

    // get the pad
    let padManager = require('../src/node/db/PadManager');
    let pad = await padManager.getPad(padId);

    // accumulate the required keys
    let neededDBValues = ["pad:" + padId];

    // add all authors
    neededDBValues.push(...pad.getAllAuthors().map(author => "globalAuthor:"));

    // add all revisions
    for (let rev = 0; rev <= pad.head; ++rev) {
      neededDBValues.push("pad:" + padId + ":revs:" + rev);
    }

    // add all chat values
    for (let chat = 0; chat <= pad.chatHead; ++chat) {
      neededDBValues.push("pad:" + padId + ":chat:" + chat);
    }

    //
    // NB: this script doesn't actually does what's documented
    //     since the `value` fields in the following `.forEach`
    //     block are just the array index numbers
    //
    //     the script therefore craps out now before it can do
    //     any damage.
    //
    //     See gitlab issue #3545
    //
    console.info("aborting [gitlab #3545]");
    process.exit(1);

    // now fetch and reinsert every key
    neededDBValues.forEach(function(key, value) {
      console.log("Key: " + key+ ", value: " + value);
      db.remove(key);
      db.set(key, value);
    });

    console.info("finished");
    process.exit(0);

  } catch (er) {
    if (er.name === "apierror") {
      console.error(er);
    } else {
      console.trace(er);
    }
  }
});
