var startTime = Date.now();

require("ep_etherpad-lite/node_modules/npm").load({}, function(er,npm) {

  var fs = require("fs");

  var ueberDB = require("ep_etherpad-lite/node_modules/ueberDB");
  var settings = require("ep_etherpad-lite/node/utils/Settings");
  var log4js = require('ep_etherpad-lite/node_modules/log4js');

  var dbWrapperSettings = {
    cache: 0,
    writeInterval: 100,
    json: false // data is already json encoded
  };
  var db = new ueberDB.database(settings.dbType, settings.dbSettings, dbWrapperSettings, log4js.getLogger("ueberDB"));

  var sqlFile = process.argv[2];

  //stop if the settings file is not set
  if(!sqlFile)
  {
    console.error("Use: node importSqlFile.js $SQLFILE");
    process.exit(1);
  }

  log("initializing db");
  db.init(function(err)
  {
    //there was an error while initializing the database, output it and stop
    if(err)
    {
      console.error("ERROR: Problem while initializing the database");
      console.error(err.stack ? err.stack : err);
      process.exit(1);
    }
    else
    {
      log("done");

      log("open output file...");
      var lines = fs.readFileSync(sqlFile, 'utf8').split("\n");

      var count = lines.length;
      var keyNo = 0;

      process.stdout.write("Start importing " + count + " keys...\n");
      lines.forEach(function(l) {
        if (l.substr(0, 27) == "REPLACE INTO store VALUES (") {
          var pos = l.indexOf("', '");
          var key = l.substr(28, pos - 28);
          var value = l.substr(pos + 3);
          value = value.substr(0, value.length - 2);
          console.log("key: " + key + " val: " + value);
          console.log("unval: " + unescape(value));
          db.set(key, unescape(value), null);
          keyNo++;
          if (keyNo % 1000 == 0) {
            process.stdout.write(" " + keyNo + "/" + count + "\n");
          }
        }
      });
      process.stdout.write("\n");
      process.stdout.write("done. waiting for db to finish transaction. depended on dbms this may take some time...\n");

      db.doShutdown(function() {
        log("finished, imported " + keyNo + " keys.");
        process.exit(0);
      });
    }
  });
});

function log(str)
{
  console.log((Date.now() - startTime)/1000 + "\t" + str);
}

unescape = function(val) {
  // value is a string
  if (val.substr(0, 1) == "'") {
    val = val.substr(0, val.length - 1).substr(1);

    return val.replace(/\\[0nrbtZ\\'"]/g, function(s) {
      switch(s) {
        case "\\0": return "\0";
        case "\\n": return "\n";
        case "\\r": return "\r";
        case "\\b": return "\b";
        case "\\t": return "\t";
        case "\\Z": return "\x1a";
        default: return s.substr(1);
      }
    });
  }

  // value is a boolean or NULL
  if (val == 'NULL') {
    return null;
  }
  if (val == 'true') {
    return true;
  }
  if (val == 'false') {
    return false;
  }

  // value is a number
  return val;
};
