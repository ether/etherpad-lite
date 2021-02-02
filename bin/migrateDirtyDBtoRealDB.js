'use strict';

// As of v14, Node.js does not exit when there is an unhandled Promise rejection. Convert an
// unhandled rejection into an uncaught exception, which does cause Node.js to exit.
process.on('unhandledRejection', (err) => { throw err; });

const npm = require('ep_etherpad-lite/node_modules/npm');
const util = require('util');

(async () => {
  await util.promisify(npm.load)({});

  process.chdir(`${npm.root}/..`);

  // This script requires that you have modified your settings.json file
  // to work with a real database.  Please make a backup of your dirty.db
  // file before using this script, just to be safe.

  // It might be necessary to run the script using more memory:
  // `node --max-old-space-size=4096 bin/migrateDirtyDBtoRealDB.js`


  const settings = require('ep_etherpad-lite/node/utils/Settings');
  const dirtyDb = require('ep_etherpad-lite/node_modules/dirty');
  const ueberDB = require('ep_etherpad-lite/node_modules/ueberdb2');
  const log4js = require('ep_etherpad-lite/node_modules/log4js');
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
  const dirty = dirtyDb('var/dirty.db');
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
