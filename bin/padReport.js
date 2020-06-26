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


if (process.argv.length != 3) {
  console.error("Use: node bin/padReport.js $PADID");
  process.exit(1);
}

// get the padID
const padId = process.argv[2];

// load and initialize NPM;
let npm = require('../src/node_modules/npm');
var async = require("ep_etherpad-lite/node_modules/async");
var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var fs = require('fs');
const chalk = require('../src/node_modules/chalk');

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
      if(err) return callback(err);

      if(authorsObj[revision.meta.author]){
        var authorColor = authorsObj[revision.meta.author].color.toUpperCase();
        var authorName = authorsObj[revision.meta.author].name;
        if(!authorName) authorName = "Anonymous"
        var opType = typeOfOp(revision.changeset);
        var actionString = ""
        if(opType === "="){
          actionString = "changed some attributes"
        }
        if(opType === "-"){
          actionString = "removed some content";
        }
        if(opType === "+"){
          actionString = "added some content";
        }
        var humanTime = new Date(revision.meta.timestamp).toLocaleTimeString();
        var humanDate = new Date(revision.meta.timestamp).toDateString();
        var logString = "At " + humanTime + " on " + humanDate + " " + authorName + " " + actionString;
        console.log(chalk.hex(authorColor)(logString));
      }

      callback()
    });
  }, function(){


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
