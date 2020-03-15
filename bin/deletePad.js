/*
 * A tool for deleting pads from the CLI, because sometimes a brick is required
 * to fix a window.
 */

if (process.argv.length != 3) {
  console.error("Use: node deletePad.js $PADID");
  process.exit(1);
}

// get the padID
let padId = process.argv[2];

let npm = require('../src/node_modules/npm');

npm.load({}, async function(er) {
  if (er) {
    console.error("Could not load NPM: " + er)
    process.exit(1);
  }

  try {
    let settings = require('../src/node/utils/Settings');
    let db = require('../src/node/db/DB');
    await db.init();

    padManager = require('../src/node/db/PadManager');
    await padManager.removePad(padId);

    console.log("Finished deleting padId: " + padId);
    process.exit(0);

  } catch (e) {
    if (err.name === "apierror") {
      console.error(e);
    } else {
      console.trace(e);
    }
    process.exit(1);
  }
});
