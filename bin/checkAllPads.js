/*
  This is a debug tool. It checks all revisions for data corruption
*/

if(process.argv.length != 2)
{
  console.error("Use: node bin/checkAllPads.js");
  process.exit(1);
}

//initalize the variables
var db, settings, padManager;
var npm = require("../src/node_modules/npm");
var async = require("../src/node_modules/async");

var Changeset = require("../src/static/js/Changeset");

async.series([
  //load npm
  function(callback) {
    npm.load({}, callback);
  },
  //load modules
  function(callback) {
    settings = require('../src/node/utils/Settings');
    db = require('../src/node/db/DB');

    //initalize the database
    db.init(callback);
  },
  //load pads
  function (callback)
  {
    padManager = require('../src/node/db/PadManager');
    
    padManager.listAllPads(function(err, res)
    {
      padIds = res.padIDs;
      callback(err);
    });
  },
  function (callback)
  {
    async.forEach(padIds, function(padId, callback)
    {
        padManager.getPad(padId, function(err, pad) {
            if (err) {
                callback(err);
            }
   
            //check if the pad has a pool
            if(pad.pool === undefined )
            {
                console.error("[" + pad.id + "] Missing attribute pool");
                callback();
                return;
            }

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
                    db.db.get("pad:"+pad.id+":revs:" + revNum, function(err, revision)
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

                    //check if the revision exists
                    if (revisions[keyRev] == null) {
                        console.error("[" + pad.id + "] Missing revision " + keyRev);
                        callback();
                        return;
                    }
                    
                    //check if there is a atext in the keyRevisions
                    if(revisions[keyRev].meta === undefined || revisions[keyRev].meta.atext === undefined)
                    {
                        console.error("[" + pad.id + "] Missing atext in revision " + keyRev);
                        callback();
                        return;
                    }
                    
                    var apool = pad.pool;
                    var atext = revisions[keyRev].meta.atext;
                    
                    for(var i=keyRev+1;i<=keyRev+100 && i<=head; i++)
                    {
                        try
                        {
                            //console.log("[" + pad.id + "] check revision " + i);
                            var cs = revisions[i].changeset;
                            atext = Changeset.applyToAText(cs, atext, apool);
                        }
                        catch(e)
                        {
                            console.error("[" + pad.id + "] Bad changeset at revision " + i + " - " + e.message);
                            callback();
                            return;
                        }
                    }
                    
                    callback();
                });
            }, callback);
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
