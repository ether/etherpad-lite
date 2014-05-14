/*
  This is a debug tool. It checks all revisions for data corruption
*/

if(process.argv.length != 3)
{
  console.error("Use: node bin/checkPad.js $PADID");
  process.exit(1);
}
//get the padID
var padId = process.argv[2];

//initalize the variables
var db, settings, padManager;
var npm = require("ep_etherpad-lite/node_modules/npm");
var async = require("ep_etherpad-lite/node_modules/async");

var Changeset = require("ep_etherpad-lite/static/js/Changeset");

// external dependencies
var expect = require('expect.js')
var diff = require('diff')

async.series([
  //load npm
  function(callback) {
    npm.load({}, function(er) {
      callback(er);
    })
  },
  //load modules
  function(callback) {
    settings = require('ep_etherpad-lite/node/utils/Settings');
    db = require('ep_etherpad-lite/node/db/DB');

    //intallize the database
    db.init(callback);
  },
  //get the pad
  function (callback)
  {
    padManager = require('ep_etherpad-lite/node/db/PadManager');

    padManager.doesPadExists(padId, function(err, exists)
    {
      if(!exists)
      {
        console.error("Pad does not exist");
        process.exit(1);
      }

      padManager.getPad(padId, function(err, _pad)
      {
        pad = _pad;
        callback(err);
      });
    });
  },
  function (callback)
  {
    //check if the pad has a pool
    if(pad.pool === undefined )
    {
      console.error("Attribute pool is missing");
      process.exit(1);
    }

    //check if the pad has atext
    if(pad.atext === undefined )
    {
      console.error("AText is missing");
      process.exit(1);
    }


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
  }
], function (err)
{
  if(err) throw err;
  else
  {
    console.log("finished");
    process.exit(0);
  }
});
