require("ep_etherpad-lite/node_modules/npm").load({}, function(er,npm) {

  process.chdir(npm.root+'/..')

  // This script requires that you have modified your settings.json file
  // to work with a real database.  Please make a backup of your dirty.db
  // file before using this script, just to be safe.

  // It might be necessary to run the script using more memory:
  // `node --max-old-space-size=4096 bin/migrateDirtyDBtoRealDB.js`


  var settings = require("ep_etherpad-lite/node/utils/Settings");
  var dirty = require("../src/node_modules/dirty");
  var ueberDB = require("../src/node_modules/ueberdb2");
  var log4js = require("../src/node_modules/log4js");
  var dbWrapperSettings = {
    "cache": "0",         // The cache slows things down when you're mostly writing.
    "writeInterval": 0    // Write directly to the database, don't buffer
  };
  var db = new ueberDB.database(settings.dbType, settings.dbSettings, dbWrapperSettings, log4js.getLogger("ueberDB"));
  var i = 0;
  var length = 0;

  db.init(function() {
    console.log("Waiting for dirtyDB to parse its file.");
    dirty = dirty('var/dirty.db').on("load", function() {
      dirty.forEach(function(){
        length++;
      });
      console.log(`Found ${length} records, processing now.`);

      dirty.forEach(async function(key, value) {
        let error = await db.set(key, value);
        console.log(`Wrote record ${i}`);
        i++;

        if (i === length) {
          console.log("finished, just clearing up for a bit...");
          setTimeout(function() {
            process.exit(0);
          }, 5000);
        }
      });
      console.log("Please wait for all records to flush to database, then kill this process.");
    });
    console.log("done?")
  });
});
