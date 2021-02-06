'use strict';

// As of v14, Node.js does not exit when there is an unhandled Promise rejection. Convert an
// unhandled rejection into an uncaught exception, which does cause Node.js to exit.
process.on('unhandledRejection', (err) => { throw err; });

(async () => {
  // This script requires that you have modified your settings.json file
  // to work with a real database.  Please make a backup of your dirty.db
  // file before using this script, just to be safe.

  // It might be necessary to run the script using more memory:
  // `node --max-old-space-size=4096 src/bin/migrateDirtyDBtoRealDB.js`

  const dirtyDb = require('dirty');
  const log4js = require('log4js');
  const settings = require('../node/utils/Settings');
  const ueberDB = require('ueberdb2');
  const util = require('util');

  const dbWrapperSettings = {
    cache: '0', // The cache slows things down when you're mostly writing.
    writeInterval: 0, // Write directly to the database, don't buffer
  };
  const db = new ueberDB.database( // eslint-disable-line new-cap
      settings.dbType,
      settings.dbSettings,
      dbWrapperSettings,
      log4js.getLogger('ueberDB'));
  await db.init();

  console.log('Waiting for dirtyDB to parse its file.');
  const dirty = dirtyDb(`${__dirname}/../../var/dirty.db`);
  const length = await new Promise((resolve) => { dirty.once('load', resolve); });

  console.log(`Found ${length} records, processing now.`);
  const p = [];
  let numWritten = 0;
  dirty.forEach((key, value) => {
    let bcb, wcb;
    p.push(new Promise((resolve, reject) => {
      bcb = (err) => { if (err != null) return reject(err); };
      wcb = (err) => {
        if (err != null) return reject(err);
        if (++numWritten % 100 === 0) console.log(`Wrote record ${numWritten} of ${length}`);
        resolve();
      };
    }));
    db.set(key, value, bcb, wcb);
  });
  await Promise.all(p);
  console.log(`Wrote all ${numWritten} records`);

  await util.promisify(db.close.bind(db))();
  console.log('Finished.');
})();
