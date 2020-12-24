'use strict';

/*
* A tool for deleting ALL GROUP sessions Etherpad user sessions from the CLI,
* because sometimes a brick is required to fix a face.
*/

const supertest = require(`${__dirname}/../src/node_modules/supertest`);
const path = require('path');
const fs = require('fs');

// Set a delete counter which will increment on each delete attempt
// TODO: Check delete is successful before incrementing
let deleteCount = 0;

// get the API Key
const filePath = path.join(__dirname, '../APIKEY.txt');
console.log('Deleting all group sessions, please be patient.');

(async () => {
  const settings = require(`${__dirname}/../tests/container/loadSettings`).loadSettings();
  const apikey = fs.readFileSync(filePath, {encoding: 'utf-8'});
  const api = supertest(`http://${settings.ip}:${settings.port}`);

  const apiVersionResponse = await api.get('/api/');
  const apiVersion = apiVersionResponse.body.currentVersion; // 1.12.5

  const groupsResponse = await api.get(`/api/${apiVersion}/listAllGroups?apikey=${apikey}`);
  const groups = groupsResponse.body.data.groupIDs; // ['whateverGroupID']

  for (const groupID of groups) {
    const sessionURI = `/api/${apiVersion}/listSessionsOfGroup?apikey=${apikey}&groupID=${groupID}`;
    const sessionsResponse = await api.get(sessionURI);
    const sessions = sessionsResponse.body.data;

    for (const sessionID of Object.keys(sessions)) {
      const deleteURI = `/api/${apiVersion}/deleteSession?apikey=${apikey}&sessionID=${sessionID}`;
      await api.get(deleteURI); // delete
      deleteCount++;
    }
  }
  console.log(`Deleted ${deleteCount} sessions`);
})();
