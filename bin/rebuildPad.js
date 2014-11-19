/*
  This is a repair tool. It rebuilds an old pad at a new pad location up to a
  known "good" revision.
*/

if(process.argv.length != 4) {
  console.error("Use: node bin/repairPad.js $PADID $REV");
  process.exit(1);
}

var npm = require("../src/node_modules/npm");
var async = require("../src/node_modules/async");
var ueberDB = require("../src/node_modules/ueberDB");

var padId = process.argv[2];
var newRevHead = process.argv[3];
var newPadId = padId + "-rebuilt";

var db, pad, newPad, settings;
var AuthorManager, ChangeSet, PadManager;

async.series([
  function(callback) {
    npm.load({}, function(err) {
      if(err) {
        console.error("Could not load NPM: " + err)
        process.exit(1);
      } else {
        callback();
      }
    })
  },
  function(callback) {
    // Get a handle into the database
    db = require('../src/node/db/DB');
    db.init(callback);
  }, function(callback) {
     // Get references to the original pad and to a newly created pad
     // HACK: This is a standalone script, so we want to write everything
     // out to the database immediately.  The only problem with this is
     // that a driver (like the mysql driver) hardcodes these values.
     db.db.db.settings = {cache: 0, writeInterval: 0, json: true};
     PadManager = require('../src/node/db/PadManager');
     PadManager.getPad(padId, function(err, _pad)  {
       pad = _pad;
       PadManager.getPad(newPadId, function(err, _newPad) {
         newPad = _newPad;
         callback();
       });
     });
  }, function(callback) {
    // Clone all Chat revisions
    var chatHead = pad.chatHead;
    for(var i = 0; i <= chatHead; i++) {
      db.db.get("pad:" + padId + ":chat:" + i, function (err, chat) {
        db.db.set("pad:" + newPadId + ":chat:" + i, chat);
        console.log("Created: Chat Revision: pad:" + newPadId + ":chat:" + i)
      });
    }
    callback();
  }, function(callback) {
    // Rebuild Pad from revisions up to and including the new revision head
    AuthorManager = require("../src/node/db/AuthorManager");
    Changeset = require("ep_etherpad-lite/static/js/Changeset");
    // Author attributes are derived from changesets, but there can also be
    // non-author attributes with specific mappings that changesets depend on
    // and, AFAICT, cannot be recreated any other way
    newPad.pool.numToAttrib = pad.pool.numToAttrib;
    for(var i = 1; i <= newRevHead; i++) {
      db.db.get("pad:" + padId + ":revs:" + i, function(err, rev) {
        var author = rev.meta.author;
        var timestamp = rev.meta.timestamp;
        var changeset = rev.changeset;
 
        var newAText = Changeset.applyToAText(changeset, newPad.atext, newPad.pool);
        Changeset.copyAText(newAText, newPad.atext);

        var newRev = ++newPad.head;

        var newRevData = {};
        newRevData.changeset = changeset;
        newRevData.meta = {};
        newRevData.meta.author = author;
        newRevData.meta.timestamp = timestamp;

        newPad.pool.putAttrib(['author', author || '']);

        if(newRev % 100 == 0)
        {
          newRevData.meta.atext = newPad.atext;
        }

        db.db.set("pad:"+newPad.id+":revs:"+newRev, newRevData);
        console.log("Created: Revision: pad:" + newPad.id + ":revs:" + newRev);

        if(author)
          AuthorManager.addPad(author, newPad.id);

        if (newRev == newRevHead) {
          callback();
        }
      });
    }
  }, function(callback) {
    // Add saved revisions up to the new revision head
    console.log(newPad.head);
    var newSavedRevisions = [];
    for(var i in pad.savedRevisions) {
      savedRev = pad.savedRevisions[i]
      if (savedRev.revNum <= newRevHead) {
        newSavedRevisions.push(savedRev);
        console.log("Added: Saved Revision: " + savedRev.revNum);
      }
    }
    newPad.savedRevisions = newSavedRevisions;
    callback();
  }, function(callback) {
    // Save the source pad
    db.db.set("pad:"+newPadId, newPad, function(err) {
      console.log("Created: Source Pad: pad:" + newPadId);
      newPad.saveToDatabase();
      callback();
    });
  }
], function (err) {
  if(err) throw err;
  else {
    console.info("finished");
    process.exit(0);
  }
});
