var startTime = new Date().getTime();

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
    console.error("Use: node importLargeSqlFile.js $SQLFILE");
    process.exit(1);
  }

  log("initializing db");
  db.init(function(err)
  {
    //there was an error while initializing the database, output it and stop
    if(err)
    {
      console.error("ERROR: Problem while initalizing the database");
      console.error(err.stack ? err.stack : err);
      process.exit(1);
    }
    else
    {
      log("done");

      process.stdout.write("Start importing keys...\n");

      var keyNo = 0;
      var buffer = '';
      var fp = fs.createReadStream(sqlFile, {encoding: 'utf8'});
      var matchRegex = RegExp('^REPLACE INTO store VALUES', 'i');

      fp.on('data', function(data) {
        fp.pause();
        var lines = data.split(/\r?\n/);

        lines[0] = buffer + data[0];
        buffer = lines.pop();

        lines.forEach(function(l) {
          if (matchRegex.test(l) === true) {
            var pos = l.indexOf("', '");
            var key = l.substr(28, pos - 28);
            var value = l.substr(pos + 3);
            value = value.substr(0, value.length - 2);
            console.log("key: " + key + " val: " + value);
            console.log("unval: " + unescape(value));
            db.set(key, unescape(value), null);
            keyNo++;
          }
        });
        fp.resume();
      });


      fp.on('end', function() {
        process.stdout.write("\n");
        process.stdout.write("done. waiting for db to finish transaction. depended on dbms this may take some time...\n");

        db.doShutdown(function() {
          log("finished, imported " + keyNo + " keys.");
          process.exit(0);
        });
      });
    }
  });
});

function log(str)
{
  console.log((new Date().getTime() - startTime)/1000 + "\t" + str);
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
