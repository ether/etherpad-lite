/*
 * This is a debug tool. It creates a report of pad activity
 */

/*
  Desired input, granularity?

  Desired output

  X date:
    0 pad created
    A added content (see more details)
    B deleted content
    C modified attributes on content

  From: https://github.com/chalk/chalk
  log(chalk.hex('#DEADED').bold('Bold gray!'));
*/

var threshold = 1;

if (process.argv.length !== 3 && process.argv.length !== 4) {
  console.error("Use: node bin/padReport.js $PADID $threshold");
  console.log("Threshold is the amount of noise, default is 1, increase to reduce amount of noise outputted..  For example 30 to see any edit that adds or removes up to 30% of the document at once.");
  process.exit(1);
}

if (process.argv[3]) {
  threshold = process.argv[3];
}

// get the padID
const padId = process.argv[2];

// load and initialize NPM;
let npm = require('../src/node_modules/npm');
var async = require("ep_etherpad-lite/node_modules/async");
var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var fs = require('fs');
const chalk = require('../src/node_modules/chalk');

// setup chalk themes
const del = chalk.keyword('red');
const attr = chalk.keyword('orange');
const add = chalk.keyword('green');

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
  var beginningTime;
  var endTime;

  for(var i=0;i<=head;i++)
  {
    revisions.push(i);
  }

  await db.db.get("pad:"+padId+":revs:" + 0, function(e, val){
    beginningTime = val.meta.timestamp;
  })

  await db.db.get("pad:"+padId+":revs:" + (revisions.length-1), function(e, val){
    endTime = val.meta.timestamp;
  })

  var authorsObj = {}

  let authors = await pad.getAllAuthors();
  for(var author in authors){
    let authr = await authorManager.getAuthor(authors[author]);
    let color = await authorManager.getAuthorColorId(authors[author]);
    let authorName = await authorManager.getAuthorName(authors[author]);
    authorsObj[authors[author]] = {};
    authorsObj[authors[author]].name = authorName;

    if(typeof color === "string" && color.indexOf("#") !== -1){
      authorsObj[authors[author]].color = color;
    }else{
      // color needs to come from index
      let palette = authorManager.getColorPalette();
      color = palette[color];
      authorsObj[authors[author]].color = color;
    }
  }

  //run trough all revisions
  async.forEachSeries(revisions, function(revNum, callback){
    //console.log('Fetching', revNum)
    db.db.get("pad:"+padId+":revs:" + revNum, function(err, revision){
      if(err){
        console.log("err", err);
        return callback(err);
      }

      if(authorsObj[revision.meta.author]){
        var authorColor = authorsObj[revision.meta.author].color.toUpperCase();
        var authorName = authorsObj[revision.meta.author].name;
        if(!authorName) authorName = "Anonymous"
        var opType = typeOfOp(revision.changeset);
        var unpacked = Changeset.unpack(revision.changeset);
        var changeLength = Math.abs(unpacked.oldLen - unpacked.newLen);
        var per = Math.round(( 100 / unpacked.oldLen) * changeLength);
        var humanTime = new Date(revision.meta.timestamp).toLocaleTimeString();
        var humanDate = new Date(revision.meta.timestamp).toDateString();

        if(opType === "="){
          var actionString = "changed some attributes"
          var keyword = "orange";
        }
        if(opType === "-"){
          var actionString = "removed some content("+changeLength+" chars[" + per +"%]";
          var keyword = "red";
        }
        if(opType === "+"){
          var actionString = "added some content("+changeLength+" chars[" + per +"%]";
          var keyword = "green"
        }
        var logString = "#" + revNum + 	" at " + humanTime + " on " + humanDate + " " + authorName + " " + actionString;

        // By default we ignore any percentage that is lower than 1%
        if(per > threshold){
          console.log(chalk.keyword(keyword)(logString));
        }
      }

      // setImmediate required else it will crash on large pads
      // See https://caolan.github.io/async/v3/ Common Pitfalls
      async.setImmediate(function() {
        callback()
      });

    });
  });
});


// returns "-", "+" or "=" depending on the type of edit
function typeOfOp(changeset){
  var unpacked = Changeset.unpack(changeset);
  var iter = Changeset.opIterator(unpacked.ops);
  while (iter.hasNext()) {
    var o = iter.next();
    var code;
    switch (o.opcode) {
    case '=':
      code = "="
      break;
    case '-':
      code = "-"
      break;
    case '+':
      {
        code = "+"
        break;
      }
    }
  }

  return code;
}
