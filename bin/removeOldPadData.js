/*
  This is a debug tool. It removes old pad data from a non-dirty database
  It also removes previous pad history so use it carefully.
*/

//get the padID
var padId = process.argv[2];

//initalize the variables
var db, settings, keys, values;
var npm = require("../src/node_modules/npm");
var async = require("../src/node_modules/async");

// Setup a removal count
var removalCount = 0;

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
    db.db.findKeys("pad:*",null, function(err, dbkeys){
      keys = dbkeys;
      callback();
    });
  },
  function (callback)
  {
    values = {};
    async.eachSeries(keys, function(key, cb){
      // only get main pad data not any revisions
      if(key.indexOf(":revs") === -1){
        db.db.get(key, function(err, value){
          // console.log("get value", key, value);
          values[key] = value;
          cb();
        });
      }else{
        cb();
      }

    }, function(){
      callback();
    });
  },
  // Removing all old pad data record
  function (callback){
    async.each(keys, function(key, cb){
      if(key.indexOf(":revs") !== -1){
        console.log("Removing", key);
        db.db.remove(key, function(err){
          removalCount++;
          if(err) console.log("err", err);
          cb();
        });
      }else{
        cb();
      }
    }, function(){
      callback();
    });
  },
  // Add latest data back in for a pad
  function (callback){
    async.eachSeries(keys, function(key, cb){
      var sauce = values[key];
      if(key.indexOf(":revs") === -1){
        // console.log("Adding data back in for", key, sauce);
        db.db.set(key, values[key]);
      }
      cb();
    }, function(){
      callback();
    });
  }
], function (err)
{
  if(err) throw err;
  else{
    console.log("finished, total database records removed "+removalCount);
    process.exit(0);
  }
});

