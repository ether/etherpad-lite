require("ep_etherpad-lite/node_modules/npm").load({}, function(er,npm) {

  process.chdir(npm.root+'/..')

  // This script requires that you have modified your settings.json file
  // to work with a real database.  Please make a backup of your dirty.db
  // file before using this script, just to be safe.

  // It might be necessary to run the script using more memory:
  // `node --max-old-space-size=4096 bin/migrateDirtyDBtoRealDB.js`


  var settings = require("ep_etherpad-lite/node/utils/Settings");
  var dirty = require("../src/node_modules/dirty")('var/dirty.db');
  var ueberDB = require("../src/node_modules/ueberdb2");
  var log4js = require("../src/node_modules/log4js");
  var dbWrapperSettings = {
      "cache": "0",         // The cache slows things down when you're mostly writing.
      "writeInterval": 0    // Write directly to the database, don't buffer
  };
  var db = new ueberDB.database(settings.dbType, settings.dbSettings, dbWrapperSettings, log4js.getLogger("ueberDB"));

  db.init(function() {
      console.log("Waiting for dirtyDB to parse its file.");
      dirty.on("load", function(length) {
          console.log("Loaded " + length + " records, processing now.");
          var remaining = length;
          dirty.forEach(function(key, value) {
              db.set(key, value, function(error) {
                  if (typeof error != 'undefined') {
                      console.log("Unexpected result handling: ", key, value, " was: ", error);
                  }
                  remaining -= 1;
                  var oldremaining = remaining;
                  if ((oldremaining % 100) == 0) {
                      console.log("Records not yet flushed to database: ", remaining);
                  }
              });
          });
      console.log("Please wait for all records to flush to database, then kill this process.");
    });
  });
});
