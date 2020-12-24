'use strict';

/*
 * A tool for deleting pads from the CLI, because sometimes a brick is required
 * to fix a window.
 */

const settings = require(`${__dirname}/../tests/container/loadSettings`).loadSettings();
const supertest = require(`${__dirname}/../src/node_modules/supertest`);
const api = supertest(`http://${settings.ip}:${settings.port}`);
const path = require('path');
const fs = require('fs');

if (process.argv.length !== 3) {
  console.error('Use: node deletePad.js $PADID');
  throw new Error();
}

// get the padID
const padId = process.argv[2];

// get the API Key
const filePath = path.join(__dirname, '../APIKEY.txt');
const apikey = fs.readFileSync(filePath, {encoding: 'utf-8'});

(async () => {
  let apiVersion = await api.get('/api/');
  apiVersion = apiVersion.body.currentVersion;
  if (!apiVersion) throw new Error('No version set in API');

  // Now we know the latest API version, let's delete pad
  const uri = `/api/${apiVersion}/deletePad?apikey=${apikey}&padID=${padId}`;
  const deleteAttempt = await api.post(uri);
  if (deleteAttempt.body.code === 1) {
    console.error('Error deleting pad', deleteAttempt.body);
    throw new Error('Error deleting pad');
  } else {
    console.log('Deleted pad', deleteAttempt.body);
  }
})();
