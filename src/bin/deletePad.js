'use strict';

/*
 * A tool for deleting pads from the CLI, because sometimes a brick is required
 * to fix a window.
 */

// As of v14, Node.js does not exit when there is an unhandled Promise rejection. Convert an
// unhandled rejection into an uncaught exception, which does cause Node.js to exit.
process.on('unhandledRejection', (err) => { throw err; });

const settings = require('../tests/container/loadSettings').loadSettings();
const path = require('path');
const fs = require('fs');
const supertest = require('supertest');

const api = supertest(`http://${settings.ip}:${settings.port}`);

if (process.argv.length !== 3) throw new Error('Use: node deletePad.js $PADID');

// get the padID
const padId = process.argv[2];

// get the API Key
const filePath = path.join(__dirname, '../../APIKEY.txt');
const apikey = fs.readFileSync(filePath, {encoding: 'utf-8'});

(async () => {
  let apiVersion = await api.get('/api/');
  apiVersion = apiVersion.body.currentVersion;
  if (!apiVersion) throw new Error('No version set in API');

  // Now we know the latest API version, let's delete pad
  const uri = `/api/${apiVersion}/deletePad?apikey=${apikey}&padID=${padId}`;
  const deleteAttempt = await api.post(uri);
  if (deleteAttempt.body.code === 1) throw new Error(`Error deleting pad ${deleteAttempt.body}`);
  console.log('Deleted pad', deleteAttempt.body);
})();
