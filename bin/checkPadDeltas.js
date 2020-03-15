/*
 * This is a debug tool. It checks all revisions for data corruption
 */

if (process.argv.length != 3) {
  console.error("Use: node bin/checkPadDeltas.js $PADID");
  process.exit(1);
}

// get the padID
const padId = process.argv[2];

// load and initialize NPM;
var expect = require('expect.js')
var diff = require('diff')
var async = require('async')

let npm = require('../src/node_modules/npm');
var async = require("ep_etherpad-lite/node_modules/async");
var Changeset = require("ep_etherpad-lite/static/js/Changeset");

npm.load({}, async function() {

  try {
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

    //create an array with key revisions
    //key revisions always save the full pad atext
    var head = pad.getHeadRevisionNumber();
    var keyRevisions = [];
    for(var i=0;i<head;i+=100)
    {
      keyRevisions.push(i);
    }

    //create an array with all revisions
    var revisions = [];
    for(var i=0;i<=head;i++)
    {
      revisions.push(i);
    }

    var atext = Changeset.makeAText("\n")

    //run trough all revisions
    async.forEachSeries(revisions, function(revNum, callback)
    {
      //console.log('Fetching', revNum)
      db.db.get("pad:"+padId+":revs:" + revNum, function(err, revision)
      {
        if(err) return callback(err);

        //check if there is a atext in the keyRevisions
        if(~keyRevisions.indexOf(revNum) && (revision === undefined || revision.meta === undefined || revision.meta.atext === undefined)) {
          console.error("No atext in key revision " + revNum);
          callback();
          return;
        }

        try {
          //console.log("check revision ", revNum);
          var cs = revision.changeset;
          atext = Changeset.applyToAText(cs, atext, pad.pool);
        }
        catch(e) {
          console.error("Bad changeset at revision " + revNum + " - " + e.message);
          callback();
          return;
        }

        if(~keyRevisions.indexOf(revNum)) {
          try {
            expect(revision.meta.atext.text).to.eql(atext.text)
            expect(revision.meta.atext.attribs).to.eql(atext.attribs)
          }catch(e) {
            console.error("Atext in key revision "+revNum+" doesn't match computed one.")
            console.log(diff.diffChars(atext.text, revision.meta.atext.text).map(function(op) {if(!op.added && !op.removed) op.value = op.value.length; return op}))
            //console.error(e)
            //console.log('KeyRev. :', revision.meta.atext)
            //console.log('Computed:', atext)
            callback()
            return
          }
        }

        setImmediate(callback)
      });
    }, function(er) {
      if(pad.atext.text == atext.text) console.log('ok')
      else {
        console.error('Pad AText doesn\'t match computed one! (Computed ',atext.text.length, ', db', pad.atext.text.length,')')
        console.log(diff.diffChars(atext.text, pad.atext.text).map(function(op) {if(!op.added && !op.removed) op.value = op.value.length; return op}))
      }
      callback(er)
    });

    process.exit(0);

  } catch (e) {
    console.trace(e);
    process.exit(1);
  }

});
