/*
  This is a debug tool. It helps to extract all datas of a pad and move it from an productive enviroment and to a develop enviroment to reproduce bugs there. It outputs a dirtydb file
*/

if(process.argv.length != 3)
{
  console.error("Use: node extractPadData.js $PADID");
  process.exit(1);
}
//get the padID
var padId = process.argv[2];

var db, dirty, padManager, pad, settings;
var neededDBValues = ["pad:"+padId];

var npm = require("../node_modules/ep_etherpad-lite/node_modules/npm");
var async = require("../node_modules/ep_etherpad-lite/node_modules/async");

async.series([
  // load npm
  function(callback) {
    npm.load({}, function(er) {
      if(er)
      {
        console.error("Could not load NPM: " + er)
        process.exit(1);
      }
      else
      {
        callback();
      }
    })
  },
  // load modules
  function(callback) {
    settings = require('../node_modules/ep_etherpad-lite/node/utils/Settings');
    db = require('../node_modules/ep_etherpad-lite/node/db/DB');
    dirty = require("../node_modules/ep_etherpad-lite/node_modules/ueberDB/node_modules/dirty")(padId + ".db");
    callback();
  },
  //intallize the database
  function (callback)
  {
    db.init(callback);
  },
  //get the pad 
  function (callback)
  {
    padManager = require('../node_modules/ep_etherpad-lite/node/db/PadManager');
    
    padManager.getPad(padId, function(err, _pad)  
    {
      pad = _pad;
      callback(err);
    });
  },
  function (callback)
  {
    //add all authors
    var authors = pad.getAllAuthors();
    for(var i=0;i<authors.length;i++)
    {
      neededDBValues.push("globalAuthor:" + authors[i]);
    }
    
    //add all revisions
    var revHead = pad.head;
    for(var i=0;i<=revHead;i++)
    {
      neededDBValues.push("pad:"+padId+":revs:" + i);
    }
    
    //get all chat values
    var chatHead = pad.chatHead;
    for(var i=0;i<=chatHead;i++)
    {
      neededDBValues.push("pad:"+padId+":chat:" + i);
    }
    
    //get and set all values
    async.forEach(neededDBValues, function(dbkey, callback)
    {
      db.db.db.wrappedDB.get(dbkey, function(err, dbvalue)
      {
        if(err) { callback(err); return}

        if(dbvalue && typeof dbvalue != 'object'){
          dbvalue=JSON.parse(dbvalue); // if its not json then parse it as json
        }
        
        dirty.set(dbkey, dbvalue, callback);
      });
    }, callback);
  }
], function (err)
{
  if(err) throw err;
  else 
  { 
    console.log("finished");
    process.exit();
  }
});

//get the pad object
//get all revisions of this pad
//get all authors related to this pad
//get the readonly link releated to this pad
//get the chat entrys releated to this pad
