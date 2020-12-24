'use strict';


const fullWrite = (key) => {
  console.log('Fully written', key);
};

const bufferWrite = (key) => {
  console.log('Buffer written', key);
};

const finish = () => {
  console.log('Finished and database has finished writing');
};

require('ep_etherpad-lite/node_modules/npm').load({}, async (er, npm) => {
  process.chdir(`${npm.root}/..`);

  // This script requires that you have modified your settings.json file
  // to work with a real database.  Please make a backup of your dirty.db
  // file before using this script, just to be safe.

  // It might be necessary to run the script using more memory:
  // `node --max-old-space-size=4096 bin/migrateDirtyDBtoRealDB.js`


  const settings = require('ep_etherpad-lite/node/utils/Settings');
  const log4js = require(`${__dirname}/../src/node_modules/log4js`);
  const ueberDB = require(`${__dirname}/../src/node_modules/ueberdb2`);
  const dbWrapperSettings = {
    cache: '0', // The cache slows things down when you're mostly writing.
    writeInterval: 0, // Write directly to the database, don't buffer
  };
  const db = new ueberDB.database( // eslint-disable-line new-cap
      settings.dbType,
      settings.dbSettings,
      dbWrapperSettings,
      log4js.getLogger('ueberDB')
  );
  let dirty = require(`${__dirname}/../src/node_modules/dirty`);

  await db.init();

  console.log('Waiting for dirtyDB to parse its file.');
  let length = 0;

  dirty = dirty('var/dirty.db').on('load', async () => {
    dirty.forEach(() => {
      length++;
    });

    console.log(`Found ${length} records, processing now.`);

    dirty.forEach(async (key, value) => {
      await db.set(key, value, bufferWrite(key), fullWrite(key));
      // console.log(`Wrote record ${key}`);
    });

    db.doShutdown(finish);
  });
  console.log('done?');
});
