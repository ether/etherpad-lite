/*
 * This is a debug tool. It checks all revisions for data corruption
 */

if (process.argv.length != 3) {
  console.error('Use: node bin/checkPad.js $PADID');
  process.exit(1);
}

// get the padID
const padId = process.argv[2];

// load and initialize NPM;
const npm = require('../src/node_modules/npm');
npm.load({}, async () => {
  try {
    // initialize database
    const settings = require('../src/node/utils/Settings');
    const db = require('../src/node/db/DB');
    await db.init();

    // load modules
    const Changeset = require('ep_etherpad-lite/static/js/Changeset');
    const padManager = require('../src/node/db/PadManager');

    const exists = await padManager.doesPadExists(padId);
    if (!exists) {
      console.error('Pad does not exist');
      process.exit(1);
    }

    // get the pad
    const pad = await padManager.getPad(padId);

    // create an array with key revisions
    // key revisions always save the full pad atext
    const head = pad.getHeadRevisionNumber();
    const keyRevisions = [];
    for (let rev = 0; rev < head; rev += 100) {
      keyRevisions.push(rev);
    }

    // run through all key revisions
    for (const keyRev of keyRevisions) {
      // create an array of revisions we need till the next keyRevision or the End
      const revisionsNeeded = [];
      for (let rev = keyRev; rev <= keyRev + 100 && rev <= head; rev++) {
        revisionsNeeded.push(rev);
      }

      // this array will hold all revision changesets
      const revisions = [];

      // run through all needed revisions and get them from the database
      for (const revNum of revisionsNeeded) {
        const revision = await db.get(`pad:${padId}:revs:${revNum}`);
        revisions[revNum] = revision;
      }

      // check if the pad has a pool
      if (pad.pool === undefined) {
        console.error('Attribute pool is missing');
        process.exit(1);
      }

      // check if there is an atext in the keyRevisions
      if (revisions[keyRev] === undefined || revisions[keyRev].meta === undefined || revisions[keyRev].meta.atext === undefined) {
        console.error(`No atext in key revision ${keyRev}`);
        continue;
      }

      const apool = pad.pool;
      let atext = revisions[keyRev].meta.atext;

      for (let rev = keyRev + 1; rev <= keyRev + 100 && rev <= head; rev++) {
        try {
          // console.log("check revision " + rev);
          const cs = revisions[rev].changeset;
          atext = Changeset.applyToAText(cs, atext, apool);
        } catch (e) {
          console.error(`Bad changeset at revision ${rev} - ${e.message}`);
          continue;
        }
      }
      console.log('finished');
      process.exit(0);
    }
  } catch (e) {
    console.trace(e);
    process.exit(1);
  }
});
