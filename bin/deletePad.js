/*
  A tool for deleting pads from the CLI, because sometimes a brick is required to fix a window.
*/

if(process.argv.length != 3)
{
  console.error("Use: node deletePad.js $PADID");
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
  // intallize the database
  function (callback)
  {
    db.init(callback);
  },
  // delete the pad and it's links
  function (callback)
  {
    padManager = require('../src/node/db/PadManager');
    
    padManager.removePad(padId, function(err){
      callback(err);
    }); 
    callback();
  }
], function (err)
{
  if(err) throw err;
  else 
  { 
    console.log("Finished deleting padId: "+padId);
    process.exit();
  }
});
