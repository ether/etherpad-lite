'use strict';
/*
 * This is a debug tool. It checks all revisions for data corruption
 */

// As of v14, Node.js does not exit when there is an unhandled Promise rejection. Convert an
// unhandled rejection into an uncaught exception, which does cause Node.js to exit.
process.on('unhandledRejection', (err) => { throw err; });

if (process.argv.length !== 3) throw new Error('Use: node src/bin/checkPad.js $PADID');
const padId = process.argv[2];
(async () => {
  const db = require('../node/db/DB');
  await db.init();
  const padManager = require('../node/db/PadManager');
  if (!await padManager.doesPadExists(padId)) throw new Error('Pad does not exist');
  const pad = await padManager.getPad(padId);
  await pad.check();
  console.log('Finished.');
})();
