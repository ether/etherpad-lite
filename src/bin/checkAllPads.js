'use strict';
/*
 * This is a debug tool. It checks all revisions for data corruption
 */

// As of v14, Node.js does not exit when there is an unhandled Promise rejection. Convert an
// unhandled rejection into an uncaught exception, which does cause Node.js to exit.
process.on('unhandledRejection', (err) => { throw err; });

if (process.argv.length !== 2) throw new Error('Use: node src/bin/checkAllPads.js');

(async () => {
  // initialize the database
  require('../node/utils/Settings');
  const db = require('../node/db/DB');
  await db.init();

  // load modules
  const Changeset = require('../static/js/Changeset');
  const padManager = require('../node/db/PadManager');

  let revTestedCount = 0;

  // get all pads
  const res = await padManager.listAllPads();
  for (const padId of res.padIDs) {
    const pad = await padManager.getPad(padId);

    // check if the pad has a pool
    if (pad.pool == null) {
      console.error(`[${pad.id}] Missing attribute pool`);
      continue;
    }
    // create an array with key kevisions
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
        const revision = await db.get(`pad:${pad.id}:revs:${revNum}`);
        revisions[revNum] = revision;
      }

      // check if the revision exists
      if (revisions[keyRev] == null) {
        console.error(`[${pad.id}] Missing revision ${keyRev}`);
        continue;
      }

      // check if there is a atext in the keyRevisions
      let {meta: {atext} = {}} = revisions[keyRev];
      if (atext == null) {
        console.error(`[${pad.id}] Missing atext in revision ${keyRev}`);
        continue;
      }

      const apool = pad.pool;
      for (let rev = keyRev + 1; rev <= keyRev + 100 && rev <= head; rev++) {
        try {
          const cs = revisions[rev].changeset;
          atext = Changeset.applyToAText(cs, atext, apool);
          revTestedCount++;
        } catch (e) {
          console.error(`[${pad.id}] Bad changeset at revision ${rev} - ${e.message}`);
        }
      }
    }
  }
  if (revTestedCount === 0) {
    throw new Error('No revisions tested');
  }
  console.log(`Finished: Tested ${revTestedCount} revisions`);
})();
