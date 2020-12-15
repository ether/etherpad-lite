/*
 * A tool for deleting pads from the CLI, because sometimes a brick is required
 * to fix a window.
 */

const request = require('../src/node_modules/request');
const settings = require(`${__dirname}/../tests/container/loadSettings`).loadSettings();
const supertest = require(`${__dirname}/../src/node_modules/supertest`);
const api = supertest(`http://${settings.ip}:${settings.port}`);
const path = require('path');
const fs = require('fs');
if (process.argv.length != 3) {
  console.error('Use: node deletePad.js $PADID');
  process.exit(1);
}

// get the padID
const padId = process.argv[2];

// get the API Key
const filePath = path.join(__dirname, '../APIKEY.txt');
const apikey = fs.readFileSync(filePath, {encoding: 'utf-8'});

// Set apiVersion to base value, we change this later.
let apiVersion = 1;

// Update the apiVersion
api.get('/api/')
    .expect((res) => {
      apiVersion = res.body.currentVersion;
      if (!res.body.currentVersion) throw new Error('No version set in API');
      return;
    })
    .end((err, res) => {
    // Now we know the latest API version, let's delete pad
      const uri = `/api/${apiVersion}/deletePad?apikey=${apikey}&padID=${padId}`;
      api.post(uri)
          .expect((res) => {
            if (res.body.code === 1) {
              console.error('Error deleting pad', res.body);
            } else {
              console.log('Deleted pad', res.body);
            }
            return;
          })
          .end(() => {});
    });
// end
