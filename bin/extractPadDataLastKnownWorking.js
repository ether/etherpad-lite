/*
 *
 * This is a debug tool. It helps to extract all datas of a pad and move it from
 * a productive environment and to a develop environment to reproduce bugs
 * there. It outputs a dirtydb file
 *
 * If you also want a database backup of the file uncomment setDirty
 * Also note that this file will overwrite a target pad so make sure you use an unused padId
 */

if (process.argv.length <= 3) {
  console.error("Use: node extractPadData.js $PADID $DESTINATIONPADID $TARGETREV");
  process.exit(1);
}
// get the padID
let padId = process.argv[2];
let destinationPadId = process.argv[3];

const npm = require('../src/node_modules/npm');
const cliProgress = require('cli-progress');

// create a new progress bar instance and use shades_classic theme
const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

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

    // get the actual pad object
    let pad = await padManager.getPad(padId);

    // and the last revision
    var lastRev = pad.head;
    // user can specify a target revision if the first attempt fails
    if(process.argv[4]) lastRev = process.argv[4];
    // We roll down to 100 IE 154 becomes 100
    lastRev = Math.floor(lastRev / 100) * 100;

    if(lastRev === 0){
      console.error("Unable to get this pad because it's last known revision is less than 100 as it only has a revision count of ", pad.head);
      process.exit(1);
    }

    // array in which required key values will be accumulated
    let neededDBValues = ['pad:' + padId]
    // the initial base of the pad
    // not the first commit but the proper store

    // try get HTML of last saved state.  Being mindful that there is a 1% failure chance
    // this wont work so a future version of this script will need to iterate backwards
    // but right now that's overkill.
    let latestRev = await pad.getInternalRevisionAText(lastRev);
    if(!latestRev){
      throw new Error("unable to get the pad lines, target " + lastRev-100)
    }

    // add all authors
    neededDBValues.push(...pad.getAllAuthors().map(author => 'globalAuthor:' + author));

    // add all revisions
    for (let rev = 0; rev <= lastRev; ++rev) {
      // console.log('pad:' + padId + ':revs:' + rev)
      neededDBValues.push('pad:' + padId + ':revs:' + rev);
    }

    // add all chat values
    for (let chat = 0; chat <= pad.chatHead; ++chat) {
      neededDBValues.push('pad:' + padId + ':chat:' + chat);
    }

    console.log("Grabbing and setting new values, please be patient.")

    // start the progress bar with a total value of 200 and start value of 0
    bar1.start(neededDBValues.length, 0);
    for (let dbkey of neededDBValues) {
      let dbvalue = await get(dbkey);
      if (dbvalue && typeof dbvalue !== 'object') {
        dbvalue = JSON.parse(dbvalue);
      }

      // Here we override the base content with the last known good rev
      if(dbkey === "pad:"+padId){
        dbvalue.atext.attribs = latestRev.attribs;
        dbvalue.atext.text = latestRev.text;
        dbvalue.head = lastRev;
      }

      dbkey = dbkey.replace(padId, destinationPadId);

      // now we need to write dbkey and dbvalue to the database.
      db.set(dbkey, dbvalue);
      bar1.increment();
    }

    // I know this is hacky but db.close doesn't work here..
    setTimeout(function(){
      bar1.stop();
      console.log("Check the pad properly renders then terminate this script.  Open your pad and hit f5 till it's present!  "+ destinationPadId)
      // db.close(); // throws an error..
     }, 5000)

  } catch (er) {
    console.error(er);
    bar1.stop();
    process.exit(1);
  }
});
