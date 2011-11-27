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

//initalize the database
var log4js = require("log4js");
log4js.setGlobalLogLevel("INFO");
var async = require("async");
var db = require('../node/db/DB');
var dirty = require("dirty")(padId + ".db");
var padManager; 
var pad;
var neededDBValues = ["pad:"+padId];

async.series([
  //intallize the database
  function (callback)
  {
    db.init(callback);
  },
  //get the pad 
  function (callback)
  {
    padManager = require('../node/db/PadManager');
    
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
        dbvalue=JSON.parse(dbvalue);
        
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
