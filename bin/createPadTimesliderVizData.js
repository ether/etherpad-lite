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
  let authorManager = require('../src/node/db/AuthorManager')

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
  var intervalsObj = {
    authors: {}
  };


  let authors = await pad.getAllAuthors();
  for(var author in authors){
    let color = await authorManager.getAuthorColorId(authors[author]);
    if(typeof color === "string" && color.indexOf("#") !== -1){
      intervalsObj.authors[authors[author]] = color;
    }else{
      // color needs to come from index
      let palette = authorManager.getColorPalette();
      color = palette[color];
      intervalsObj.authors[authors[author]] = color;
    }
  }

  // Total duration of pad
  var durationOfPad = endTime - beginningTime;
  var divideAmount = 100; //experimental amount to divide by.
  var heightAmount = 10; // experimental amount to say how many vertical blocks we can have.

  // We divide this to divideAmount and put the stats into that.
  var intervals = Math.round(durationOfPad / divideAmount);

  var maxCount = 0; // used for drawing data later.

  // go through each interval span and create an object placeholder.
  i = 0;

  // divideAmount represents X axis
  while (i < divideAmount){
    // creates an empty object which we wil store data into
    intervalsObj[i] = {
      count: 0,
      authors: {}
    };
    i++;
  }

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

      // if we already have a changeset landed in this X position we increase the value
      if(intervalsObj[revLocation]){
        intervalsObj[revLocation].count = intervalsObj[revLocation].count+1;

        // Saving unique authors so we can look them up later
        // cake why is below commented out?
        // if(!intervalsObj[revLocation].authors[revision.meta.author]){
          // sometimes ghost authors can exist (API inserts etc. so ignore those)
          if(revision.meta.author.length !== 0){
            intervalsObj[revLocation].authors[revision.meta.author] = {};
            intervalsObj[revLocation].authors[revision.meta.author].count = 0;
            intervalsObj[revLocation].authors[revision.meta.author].count = intervalsObj[revLocation].authors[revision.meta.author].count+1;
          }

        //} // cake why is this ommented out?

      }

      callback()
    });
  }, function(){
    console.log(intervalsObj);
    var i = 0;
    while(i < divideAmount){

      if(intervalsObj[i].count > maxCount){
        maxCount = intervalsObj[i].count; // max edits in an interval
      }

      i++;
    }

    // how many vertical blocks are represented by each change.
    var verticalBlocksPerChange = heightAmount / maxCount;
    console.log("vertBlocks", verticalBlocksPerChange)
    // relative to number of max edits, how many were in this interval
    i = 0;
    while(i < divideAmount){
      // 100 here is used to get a percentage so a fixed value is fine.
      relativeCount = (100/maxCount) * intervalsObj[i].count;
      intervalsObj[i].relativeCount = Math.round(relativeCount);
      // console.log(i, intervalsObj[i])
      if(intervalsObj[i].count !== 0){
        // console.log(intervalsObj[i].authors)
        for(var author in intervalsObj[i].authors){
          authorStats = intervalsObj[i].authors[author];
          // this is the value that will be used.
          intervalsObj[i].authors[author].verticalBlocks = Math.round(verticalBlocksPerChange * intervalsObj[i].authors[author].count);
          console.log(intervalsObj[i].authors[author].count, verticalBlocksPerChange)
          console.log("authorStats", author, authorStats)
        }
      }
      i++;
    }
    draw(intervalsObj)
  });
});

function draw(intervalsObj){

  // for each "rev"
  for(var vertical in intervalsObj){
    var vert = intervalsObj[vertical];
    var authorColors = intervalsObj.authors;

    // for every author
    for (var author in authorColors){
      if (!vert.count) continue;
      var authorsArr = Object.keys(vert.authors);

      // is author present in revision?
      if (authorsArr.indexOf(author) !== -1){
         // get relative blocks for this author.
//         console.log("present")
      }
//      console.log(intervalsObj[vertical]);
    }
  }
}
