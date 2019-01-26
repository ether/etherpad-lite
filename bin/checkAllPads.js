/*
 * This is a debug tool. It checks all revisions for data corruption
 */

if (process.argv.length != 2) {
  console.error("Use: node bin/checkAllPads.js");
  process.exit(1);
}

// load and initialize NPM
let npm = require('../src/node_modules/npm');
npm.load({}, async function() {

  try {
    // initialize the database
    let settings = require('../src/node/utils/Settings');
    let db = require('../src/node/db/DB');
    await db.init();

    // load modules
    let Changeset = require('../src/static/js/Changeset');
    let padManager = require('../src/node/db/PadManager');

    // get all pads
    let res = await padManager.listAllPads();

    for (let padId of res.padIDs) {

      let pad = await padManager.getPad(padId);

      // check if the pad has a pool
      if (pad.pool === undefined) {
        console.error("[" + pad.id + "] Missing attribute pool");
        continue;
      }

      // create an array with key kevisions
      // key revisions always save the full pad atext
      let head = pad.getHeadRevisionNumber();
      let keyRevisions = [];
      for (let rev = 0; rev < head; rev += 100) {
        keyRevisions.push(rev);
      }

      // run through all key revisions
      for (let keyRev of keyRevisions) {

        // create an array of revisions we need till the next keyRevision or the End
        var revisionsNeeded = [];
        for (let rev = keyRev ; rev <= keyRev + 100 && rev <= head; rev++) {
          revisionsNeeded.push(rev);
        }

        // this array will hold all revision changesets
        var revisions = [];

        // run through all needed revisions and get them from the database
        for (let revNum of revisionsNeeded) {
           let revision = await db.get("pad:" + pad.id + ":revs:" + revNum);
           revisions[revNum] = revision;
        }

        // check if the revision exists
        if (revisions[keyRev] == null) {
          console.error("[" + pad.id + "] Missing revision " + keyRev);
          continue;
        }

        // check if there is a atext in the keyRevisions
        if (revisions[keyRev].meta === undefined || revisions[keyRev].meta.atext === undefined) {
          console.error("[" + pad.id + "] Missing atext in revision " + keyRev);
          continue;
        }

        let apool = pad.pool;
        let atext = revisions[keyRev].meta.atext;

        for (let rev = keyRev + 1; rev <= keyRev + 100 && rev <= head; rev++) {
          try {
            let cs = revisions[rev].changeset;
            atext = Changeset.applyToAText(cs, atext, apool);
          } catch (e) {
            console.error("[" + pad.id + "] Bad changeset at revision " + i + " - " + e.message);
          }
        }
      }
      console.log("finished");
      process.exit(0);
    }
  } catch (err) {
    console.trace(err);
    process.exit(1);
  }
});
