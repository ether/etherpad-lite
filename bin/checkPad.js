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

//initalize the database
var log4js = require("../src/node_modules/log4js");
log4js.setGlobalLogLevel("INFO");
var async = require("../src/node_modules/async");
var db = require('../src/node/db/DB');

var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var padManager;

async.series([
  //intallize the database
  function (callback)
  {
    db.init(callback);
  },
  //get the pad 
  function (callback)
  {
    padManager = require('../src/node/db/PadManager');
    
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
    //create an array with key kevisions
    //key revisions always save the full pad atext
    var head = pad.getHeadRevisionNumber();
    var keyRevisions = [];
    for(var i=0;i<head;i+=100)
    {
      keyRevisions.push(i);
    }
    
    //run trough all key revisions
    async.forEachSeries(keyRevisions, function(keyRev, callback)
    {
      //create an array of revisions we need till the next keyRevision or the End
      var revisionsNeeded = [];
      for(var i=keyRev;i<=keyRev+100 && i<=head; i++)
      {
        revisionsNeeded.push(i);
      }
      
      //this array will hold all revision changesets
      var revisions = [];
      
      //run trough all needed revisions and get them from the database
      async.forEach(revisionsNeeded, function(revNum, callback)
      {
        db.db.get("pad:"+padId+":revs:" + revNum, function(err, revision)
        {
          revisions[revNum] = revision;
          callback(err);
        });
      }, function(err)
      {
        if(err)
        {
          callback(err);
          return;
        }
        
        //check if the pad has a pool
        if(pad.pool === undefined )
        {
          console.error("Attribute pool is missing");
          process.exit(1);
        }
        
        //check if there is a atext in the keyRevisions
        if(revisions[keyRev] === undefined || revisions[keyRev].meta === undefined || revisions[keyRev].meta.atext === undefined)
        {
          console.error("No atext in key revision " + keyRev);
          callback();
          return;
        }
        
        var apool = pad.pool;
        var atext = revisions[keyRev].meta.atext;
        
        for(var i=keyRev+1;i<=keyRev+100 && i<=head; i++)
        {
          try
          {
            //console.log("check revision " + i);
            var cs = revisions[i].changeset;
            atext = Changeset.applyToAText(cs, atext, apool);
          }
          catch(e)
          {
            console.error("Bad changeset at revision " + i + " - " + e.message);
            callback();
            return;
          }
        }
        
        callback();
      });
    }, callback);
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
