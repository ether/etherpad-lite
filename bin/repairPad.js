/*
  This is a repair tool. It extracts all datas of a pad, removes and inserts them again.
*/

console.warn("WARNING: This script must not be used while etherpad is running!");

if(process.argv.length != 3)
{
  console.error("Use: node bin/repairPad.js $PADID");
  process.exit(1);
}
//get the padID
var padId = process.argv[2];

var db, padManager, pad, settings;
var neededDBValues = ["pad:"+padId];

var npm = require("../src/node_modules/npm");
var async = require("../src/node_modules/async");

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
    settings = require('../src/node/utils/Settings');
    db = require('../src/node/db/DB');
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
    padManager = require('../src/node/db/PadManager');
    
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
    callback();
  },
  function (callback) {
    db = db.db;
    neededDBValues.forEach(function(key, value) {
      console.debug("Key: "+key+", value: "+value);
      db.remove(key);
      db.set(key, value);
    });
    callback();
  }
], function (err)
{
  if(err) throw err;
  else 
  { 
    console.info("finished");
    process.exit();
  }
});

//get the pad object
//get all revisions of this pad
//get all authors related to this pad
//get the readonly link releated to this pad
//get the chat entrys releated to this pad
//remove all keys from database and insert them again
