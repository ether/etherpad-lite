/*
 *
 * This is a debug tool. It helps to extract all datas of a pad and move it from
 * a productive environment and to a develop environment to reproduce bugs
 * there. It outputs a dirtydb file
 *
 * If you also want a database backup of the file uncomment setDirty
 */

if (process.argv.length != 4) {
  console.error("Use: node extractPadData.js $PADID $DESTINATIONPADID $TARGETREV");
  process.exit(1);
}
// get the padID
let padId = process.argv[2];
let destinationPadId = process.argv[3];

let npm = require('../src/node_modules/npm');

npm.load({}, async function(er) {
  if (er) {
    console.error("Could not load NPM: " + er)
    process.exit(1);
  }

  try {
    // initialize database
    let settings = require('../src/node/utils/Settings');
    let db = require('../src/node/db/DB');
    await db.init();

    // load extra modules
    let dirtyDB = require('../src/node_modules/dirty');
    let padManager = require('../src/node/db/PadManager');
    let util = require('util');

    // initialize output database
    let dirty = dirtyDB(padId + '.db');

    // Promise wrapped get and set function
    let wrapped = db.db.db.wrappedDB;
    let get = util.promisify(wrapped.get.bind(wrapped));
    let setDirty = util.promisify(dirty.set.bind(dirty));
    let set = util.promisify(wrapped.set.bind(wrapped));

    // array in which required key values will be accumulated
    let neededDBValues = ['pad:' + padId];

    // get the actual pad object
    let pad = await padManager.getPad(padId);
    // and the last revision
    var lastRev = pad.head;
    // user can specify a target revision if the first attempt fails
    if(process.argv[4]) lastRev = process.argv[4];
    // We roll down to 100 IE 154 becomes 100
    lastRev = Math.floor(lastRev / 100) * 100;

    // try get HTML of last saved state.  Being mindful that there is a 1% failure chance
    // this wont work so a future version of this script will need to iterate backwards
    // but right now that's overkill.
    let padLines = await pad.getInternalRevisionAText(lastRev);
    if(!padLines){
      console.log("unable to get the pad lines, target " + lastRev-100)
    }

    // add all authors
    neededDBValues.push(...pad.getAllAuthors().map(author => 'globalAuthor:' + author));

    // add all revisions
    for (let rev = 0; rev <= pad.head; ++rev) {
      neededDBValues.push('pad:' + padId + ':revs:' + rev);
    }

    // add all chat values
    for (let chat = 0; chat <= pad.chatHead; ++chat) {
      neededDBValues.push('pad:' + padId + ':chat:' + chat);
    }
    for (let dbkey of neededDBValues) {
      let dbvalue = await get(dbkey);
      if (dbvalue && typeof dbvalue !== 'object') {
        dbvalue = JSON.parse(dbvalue);
      }
      dbkey = dbkey.replace(padId, destinationPadId)
      await set(dbkey, dbvalue);
      // await setDirty(dbkey, dbvalue);
    }
    console.log('finished, restart Etherpad BEFORE attempting to visit the new Pad.');
    process.exit(0);
  } catch (er) {
    console.error(er);
    process.exit(1);
  }
});
