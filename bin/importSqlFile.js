var startTime = new Date().getTime();
var fs = require("fs");
var db = require("../src/node/db/DB");
//var async = require("../src/node_modules/async");

var sqlFile = process.argv[2];

//stop if the settings file is not set
if(!sqlFile)
{
  console.error("Use: node importSqlIntoRedis.js $SQLFILE");
  process.exit(1);
}

log("initializing db");
db.init(function(){
  log("done");

  log("open output file...");
  var file = fs.readFileSync(sqlFile, 'utf8');

  var keyNo = 0;

  file.split("\n").forEach(function(l) {
    if (l.substr(0, 27) == "REPLACE INTO store VALUES (") {
      var pos = l.indexOf("', '");
      var key = l.substr(28, pos - 28);
      var value = l.substr(pos + 4);
      value = value.substr(0, value.length - 3);
      db.db.set(key, value, null);
      keyNo++;
    }
  });

  db.db.doShutdown(function() {
    log("finished, imported " + keyNo + " keys.");
    process.exit(0);
  });
});


function log(str)
{
  console.log((new Date().getTime() - startTime)/1000 + "\t" + str);
}