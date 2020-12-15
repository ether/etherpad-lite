require('ep_etherpad-lite/node_modules/npm').load({}, (er, npm) => {
  process.chdir(`${npm.root}/..`);

  // This script requires that you have modified your settings.json file
  // to work with a real database.  Please make a backup of your dirty.db
  // file before using this script, just to be safe.

  // It might be necessary to run the script using more memory:
  // `node --max-old-space-size=4096 bin/migrateDirtyDBtoRealDB.js`


  const settings = require('ep_etherpad-lite/node/utils/Settings');
  let dirty = require('../src/node_modules/dirty');
  const ueberDB = require('../src/node_modules/ueberdb2');
  const log4js = require('../src/node_modules/log4js');
  const dbWrapperSettings = {
    cache: '0', // The cache slows things down when you're mostly writing.
    writeInterval: 0, // Write directly to the database, don't buffer
  };
  const db = new ueberDB.database(settings.dbType, settings.dbSettings, dbWrapperSettings, log4js.getLogger('ueberDB'));
  let i = 0;
  let length = 0;

  db.init(() => {
    console.log('Waiting for dirtyDB to parse its file.');
    dirty = dirty('var/dirty.db').on('load', () => {
      dirty.forEach(() => {
        length++;
      });
      console.log(`Found ${length} records, processing now.`);

      dirty.forEach(async (key, value) => {
        const error = await db.set(key, value);
        console.log(`Wrote record ${i}`);
        i++;

        if (i === length) {
          console.log('finished, just clearing up for a bit...');
          setTimeout(() => {
            process.exit(0);
          }, 5000);
        }
      });
      console.log('Please wait for all records to flush to database, then kill this process.');
    });
    console.log('done?');
  });
});
