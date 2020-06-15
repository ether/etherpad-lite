/*
 * This is a debug tool. It creates the data used for the timeslide vizualization
 */

if (process.argv.length != 3) {
  console.error("Use: node bin/checkPadTimesliderVizData.js $PADID");
  process.exit(1);
}

// get the padID
const padId = process.argv[2];

// load and initialize NPM;
let npm = require('../src/node_modules/npm');
var async = require("ep_etherpad-lite/node_modules/async");
var Changeset = require("ep_etherpad-lite/static/js/Changeset");

npm.load({}, async function() {

  // initialize database
  let settings = require('../src/node/utils/Settings');
  let db = require('../src/node/db/DB');
  await db.init();

  // load modules
  let Changeset = require('ep_etherpad-lite/static/js/Changeset');
  let padManager = require('../src/node/db/PadManager');

  let exists = await padManager.doesPadExists(padId);
  if (!exists) {
    console.error("Pad does not exist");
    process.exit(1);
  }

  // get the pad
  let pad = await padManager.getPad(padId);
  var head = pad.getHeadRevisionNumber();

  //create an array with all revisions
  var revisions = [];
  for(var i=0;i<=head;i++)
  {
    revisions.push(i);
  }

  //run trough all revisions
  var str = "";
  async.forEachSeries(revisions, function(revNum, callback){
    //console.log('Fetching', revNum)
    db.db.get("pad:"+padId+":revs:" + revNum, function(err, revision){
      if(err) return callback(err);

      str += revision.meta.timestamp + "," + revision.meta.author + "," + 1 + "\n";

      setImmediate(callback)
    });
    console.log(str)
  });
});
