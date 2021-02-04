'use strict';
/*
 * This is a debug tool. It checks all revisions for data corruption
 */

// As of v14, Node.js does not exit when there is an unhandled Promise rejection. Convert an
// unhandled rejection into an uncaught exception, which does cause Node.js to exit.
process.on('unhandledRejection', (err) => { throw err; });

if (process.argv.length !== 3) throw new Error('Use: node src/bin/checkPadDeltas.js $PADID');

// get the padID
const padId = process.argv[2];

const expect = require('../tests/frontend/lib/expect');
const diff = require('diff');

(async () => {
  // initialize database
  require('../node/utils/Settings');
  const db = require('../node/db/DB');
  await db.init();

  // load modules
  const Changeset = require('../static/js/Changeset');
  const padManager = require('../node/db/PadManager');

  const exists = await padManager.doesPadExists(padId);
  if (!exists) throw new Error('Pad does not exist');

  // get the pad
  const pad = await padManager.getPad(padId);

  // create an array with key revisions
  // key revisions always save the full pad atext
  const head = pad.getHeadRevisionNumber();
  const keyRevisions = [];
  for (let i = 0; i < head; i += 100) {
    keyRevisions.push(i);
  }

  // create an array with all revisions
  const revisions = [];
  for (let i = 0; i <= head; i++) {
    revisions.push(i);
  }

  let atext = Changeset.makeAText('\n');

  // run through all revisions
  for (const revNum of revisions) {
    // console.log('Fetching', revNum)
    const revision = await db.get(`pad:${padId}:revs:${revNum}`);
    // check if there is a atext in the keyRevisions
    const {meta: {atext: revAtext} = {}} = revision || {};
    if (~keyRevisions.indexOf(revNum) && revAtext == null) {
      console.error(`No atext in key revision ${revNum}`);
      continue;
    }

    // try glue everything together
    try {
      // console.log("check revision ", revNum);
      const cs = revision.changeset;
      atext = Changeset.applyToAText(cs, atext, pad.pool);
    } catch (e) {
      console.error(`Bad changeset at revision ${revNum} - ${e.message}`);
      continue;
    }

    // check things are working properly
    if (~keyRevisions.indexOf(revNum)) {
      try {
        expect(revision.meta.atext.text).to.eql(atext.text);
        expect(revision.meta.atext.attribs).to.eql(atext.attribs);
      } catch (e) {
        console.error(`Atext in key revision ${revNum} doesn't match computed one.`);
        console.log(diff.diffChars(atext.text, revision.meta.atext.text).map((op) => {
          if (!op.added && !op.removed) op.value = op.value.length;
          return op;
        }));
        // console.error(e)
        // console.log('KeyRev. :', revision.meta.atext)
        // console.log('Computed:', atext)
        continue;
      }
    }
  }

  // check final text is right...
  if (pad.atext.text === atext.text) {
    console.log('ok');
  } else {
    console.error('Pad AText doesn\'t match computed one! (Computed ',
        atext.text.length, ', db', pad.atext.text.length, ')');
    console.log(diff.diffChars(atext.text, pad.atext.text).map((op) => {
      if (!op.added && !op.removed) {
        op.value = op.value.length;
        return op;
      }
    }));
  }
})();
