'use strict';
/*
 * This is a debug tool. It checks all revisions for data corruption
 */

// As of v14, Node.js does not exit when there is an unhandled Promise rejection. Convert an
// unhandled rejection into an uncaught exception, which does cause Node.js to exit.
process.on('unhandledRejection', (err) => { throw err; });

if (process.argv.length !== 3) throw new Error('Use: node src/bin/checkPad.js $PADID');

// get the padID
const padId = process.argv[2];
let checkRevisionCount = 0;

(async () => {
  // initialize database
  require('../node/utils/Settings');
  const db = require('../node/db/DB');
  await db.init();

  // load modules
  const Changeset = require('../static/js/Changeset');
  const padManager = require('../node/db/PadManager');

  const exists = await padManager.doesPadExists(padId);
  if (!exists) throw new Error('Pad does not exist');

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
  for (let keyRev of keyRevisions) {
    keyRev = parseInt(keyRev);
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
    if (pad.pool == null) throw new Error('Attribute pool is missing');

    // check if there is an atext in the keyRevisions
    let {meta: {atext} = {}} = revisions[keyRev] || {};
    if (atext == null) {
      console.error(`No atext in key revision ${keyRev}`);
      continue;
    }

    const apool = pad.pool;

    for (let rev = keyRev + 1; rev <= keyRev + 100 && rev <= head; rev++) {
      checkRevisionCount++;
      try {
        const cs = revisions[rev].changeset;
        atext = Changeset.applyToAText(cs, atext, apool);
      } catch (e) {
        console.error(`Bad changeset at revision ${rev} - ${e.message}`);
        continue;
      }
    }
    console.log(`Finished: Checked ${checkRevisionCount} revisions`);
  }
})();
