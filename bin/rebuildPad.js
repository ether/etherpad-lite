/*
  This is a repair tool. It rebuilds an old pad at a new pad location up to a
  known "good" revision.
*/

if (process.argv.length != 4 && process.argv.length != 5) {
  console.error('Use: node bin/repairPad.js $PADID $REV [$NEWPADID]');
  process.exit(1);
}

const npm = require('../src/node_modules/npm');
const async = require('../src/node_modules/async');
const ueberDB = require('../src/node_modules/ueberdb2');

const padId = process.argv[2];
const newRevHead = process.argv[3];
const newPadId = process.argv[4] || `${padId}-rebuilt`;

let db, oldPad, newPad, settings;
let AuthorManager, ChangeSet, Pad, PadManager;

async.series([
  function (callback) {
    npm.load({}, (err) => {
      if (err) {
        console.error(`Could not load NPM: ${err}`);
        process.exit(1);
      } else {
        callback();
      }
    });
  },
  function (callback) {
    // Get a handle into the database
    db = require('../src/node/db/DB');
    db.init(callback);
  },
  function (callback) {
    PadManager = require('../src/node/db/PadManager');
    Pad = require('../src/node/db/Pad').Pad;
    // Get references to the original pad and to a newly created pad
    // HACK: This is a standalone script, so we want to write everything
    // out to the database immediately.  The only problem with this is
    // that a driver (like the mysql driver) can hardcode these values.
    db.db.db.settings = {cache: 0, writeInterval: 0, json: true};
    // Validate the newPadId if specified and that a pad with that ID does
    // not already exist to avoid overwriting it.
    if (!PadManager.isValidPadId(newPadId)) {
      console.error('Cannot create a pad with that id as it is invalid');
      process.exit(1);
    }
    PadManager.doesPadExists(newPadId, (err, exists) => {
      if (exists) {
        console.error('Cannot create a pad with that id as it already exists');
        process.exit(1);
      }
    });
    PadManager.getPad(padId, (err, pad) => {
      oldPad = pad;
      newPad = new Pad(newPadId);
      callback();
    });
  },
  function (callback) {
    // Clone all Chat revisions
    const chatHead = oldPad.chatHead;
    for (var i = 0, curHeadNum = 0; i <= chatHead; i++) {
      db.db.get(`pad:${padId}:chat:${i}`, (err, chat) => {
        db.db.set(`pad:${newPadId}:chat:${curHeadNum++}`, chat);
        console.log(`Created: Chat Revision: pad:${newPadId}:chat:${curHeadNum}`);
      });
    }
    callback();
  },
  function (callback) {
    // Rebuild Pad from revisions up to and including the new revision head
    AuthorManager = require('../src/node/db/AuthorManager');
    Changeset = require('ep_etherpad-lite/static/js/Changeset');
    // Author attributes are derived from changesets, but there can also be
    // non-author attributes with specific mappings that changesets depend on
    // and, AFAICT, cannot be recreated any other way
    newPad.pool.numToAttrib = oldPad.pool.numToAttrib;
    for (let curRevNum = 0; curRevNum <= newRevHead; curRevNum++) {
      db.db.get(`pad:${padId}:revs:${curRevNum}`, (err, rev) => {
        if (rev.meta) {
          throw 'The specified revision number could not be found.';
        }
        const newRevNum = ++newPad.head;
        const newRevId = `pad:${newPad.id}:revs:${newRevNum}`;
        db.db.set(newRevId, rev);
        AuthorManager.addPad(rev.meta.author, newPad.id);
        newPad.atext = Changeset.applyToAText(rev.changeset, newPad.atext, newPad.pool);
        console.log(`Created: Revision: pad:${newPad.id}:revs:${newRevNum}`);
        if (newRevNum == newRevHead) {
          callback();
        }
      });
    }
  },
  function (callback) {
    // Add saved revisions up to the new revision head
    console.log(newPad.head);
    const newSavedRevisions = [];
    for (const i in oldPad.savedRevisions) {
      savedRev = oldPad.savedRevisions[i];
      if (savedRev.revNum <= newRevHead) {
        newSavedRevisions.push(savedRev);
        console.log(`Added: Saved Revision: ${savedRev.revNum}`);
      }
    }
    newPad.savedRevisions = newSavedRevisions;
    callback();
  },
  function (callback) {
    // Save the source pad
    db.db.set(`pad:${newPadId}`, newPad, (err) => {
      console.log(`Created: Source Pad: pad:${newPadId}`);
      newPad.saveToDatabase().then(() => callback(), callback);
    });
  },
], (err) => {
  if (err) { throw err; } else {
    console.info('finished');
    process.exit(0);
  }
});
