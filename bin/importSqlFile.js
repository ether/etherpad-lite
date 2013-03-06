var startTime = new Date().getTime();

require("ep_etherpad-lite/node_modules/npm").load({}, function(er,npm) {

  var fs = require("fs");
  var db = require("ep_etherpad-lite/node/db/DB");;

  var sqlFile = process.argv[2];

  //stop if the settings file is not set
  if(!sqlFile)
  {
    console.error("Use: node importSqlFile.js $SQLFILE");
    process.exit(1);
  }

  log("initializing db");
  db.init(function(){
    log("done");

    log("open output file...");
    var lines = fs.readFileSync(sqlFile, 'utf8').split("\n");;

    var count = lines.length;
    var keyNo = 0;

    process.stdout.write("Start importing " + count + " keys...\n");
    lines.forEach(function(l) {
      if (l.substr(0, 27) == "REPLACE INTO store VALUES (") {
        var pos = l.indexOf("', '");
        var key = l.substr(28, pos - 28);
        var value = l.substr(pos + 4);
        value = value.substr(0, value.length - 3);
        db.db.set(key, value, null);
        keyNo++;
        if (keyNo % 1000 == 0) {
          process.stdout.write(" " + keyNo + "/" + count + "\n");
        }
      }
    });
    process.stdout.write("\n");

    db.db.doShutdown(function() {
      log("finished, imported " + keyNo + " keys.");
      process.exit(0);
    });
  });
});

function log(str)
{
  console.log((new Date().getTime() - startTime)/1000 + "\t" + str);
}