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
var fs = require('fs');

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

  var beginningTime;
  await db.db.get("pad:"+padId+":revs:" + 0, function(e, val){
    beginningTime = val.meta.timestamp;
  })

  var endTime;
  await db.db.get("pad:"+padId+":revs:" + (revisions.length-1), function(e, val){
    endTime = val.meta.timestamp;
  })

  // Total duration of pad
  var durationOfPad = endTime - beginningTime;
  var divideAmount = 100; //experimental amount to divide by.

  // We divide this to divideAmount and put the stats into that.
  var intervals = Math.round(durationOfPad / divideAmount);

  console.log("intervals", intervals)

  var intervalsObj = {};

  i = 0;
  while (i < divideAmount){
    intervalsObj[i] = {
      count: 0,
      authors: {}
    };
    i++;
  }

  // console.log("revisions,length", revisions.length)

  //run trough all revisions
  async.forEachSeries(revisions, function(revNum, callback){
    //console.log('Fetching', revNum)
    db.db.get("pad:"+padId+":revs:" + revNum, function(err, revision){
      if(err) return callback(err);

      if(revNum !== 0){
        var revLocation = (revision.meta.timestamp - beginningTime) / intervals;
        revLocation = Math.floor(revLocation);
      }else{
        var revLocation = 0;
      }
      var arr = intervalsObj[revLocation];
      intervalsObj[revLocation].count = intervalsObj[revLocation].count+1;
      if(!intervalsObj[revLocation].authors[revision.meta.author]){
        intervalsObj[revLocation].authors[revision.meta.author] = {};
        intervalsObj[revLocation].authors[revision.meta.author].count = 0;
      }
      intervalsObj[revLocation].authors[revision.meta.author].count = intervalsObj[revLocation].authors[revision.meta.author].count+1;
      setImmediate(callback)
    });
  }, function(){
    console.log(intervalsObj);
  });
});
