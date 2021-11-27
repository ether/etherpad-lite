'use strict';
/*
 * This is a debug tool. It checks all revisions for data corruption
 */

// As of v14, Node.js does not exit when there is an unhandled Promise rejection. Convert an
// unhandled rejection into an uncaught exception, which does cause Node.js to exit.
process.on('unhandledRejection', (err) => { throw err; });

if (process.argv.length !== 2) throw new Error('Use: node src/bin/checkAllPads.js');

(async () => {
  const db = require('../node/db/DB');
  await db.init();
  const padManager = require('../node/db/PadManager');
  await Promise.all((await padManager.listAllPads()).padIDs.map(async (padId) => {
    const pad = await padManager.getPad(padId);
    try {
      await pad.check();
    } catch (err) {
      console.error(`Error in pad ${padId}: ${err.stack || err}`);
      return;
    }
    console.log(`Pad ${padId}: OK`);
  }));
  console.log('Finished.');
})();
