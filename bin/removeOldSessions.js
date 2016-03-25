/*
  This is a debug tool. It removes old sessions from a couch database
*/

/*
if(process.argv.length != 3)
{
  console.error("Use: node bin/checkPad.js $PADID");
  process.exit(1);
}
*/

//get the padID
var padId = process.argv[2];

//initalize the variables
var db, settings, keys, values;
var npm = require("../src/node_modules/npm");
var async = require("../src/node_modules/async");

async.series([
  //load npm
  function(callback) {
    npm.load({}, function(er) {
      callback(er);
    })
  },
  //load modules
  function(callback) {
    settings = require('../src/node/utils/Settings');
    db = require('../src/node/db/DB');

    //intallize the database
    db.init(callback);
  },
  //get the session info
  function (callback){
    db.db.findKeys("sessionstorage:*",null, function(err, dbkeys){
      keys = dbkeys;
      callback();
    });
  },
  function (callback)
  {
    values = {};
    async.eachSeries(keys, function(key, cb){
      db.db.get(key, function(err, value){
        // console.log("err", err);
        // console.log("value", key, value);
        values[key] = value;
        cb();
      });
    }, function(){
      callback();
    });
  },
  // Removing a session record
  function (callback){
    async.each(keys, function(key, cb){
      console.log("Removing", key);
        db.db.remove(key, function(err){
        if(err) console.log("err", err);
        cb();
      });
    }, function(){
      callback();
    });
  },
  // Add latest data back in for a session
  function (callback){
    async.eachSeries(keys, function(key, cb){
      console.log("Adding data back in for", key);
      db.db.set(key, values[key]);
      cb();
    }, function(){
      callback();
    });
  }
], function (err)
{
  if(err) throw err;
  else{
    console.log("finished");
    process.exit(0);
  }
});

