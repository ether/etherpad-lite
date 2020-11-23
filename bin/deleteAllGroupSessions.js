/*
* A tool for deleting ALL GROUP sessions Etherpad user sessions from the CLI,
* because sometimes a brick is required to fix a face.
*/

const request = require('../src/node_modules/request');
const settings = require(`${__dirname}/../tests/container/loadSettings`).loadSettings();
const supertest = require(`${__dirname}/../src/node_modules/supertest`);
const api = supertest(`http://${settings.ip}:${settings.port}`);
const path = require('path');
const fs = require('fs');

// get the API Key
const filePath = path.join(__dirname, '../APIKEY.txt');
const apikey = fs.readFileSync(filePath, {encoding: 'utf-8'});

// Set apiVersion to base value, we change this later.
let apiVersion = 1;
let guids;

// Update the apiVersion
api.get('/api/')
    .expect((res) => {
      apiVersion = res.body.currentVersion;
      if (!res.body.currentVersion) throw new Error('No version set in API');
      return;
    })
    .then(() => {
      const guri = `/api/${apiVersion}/listAllGroups?apikey=${apikey}`;
      api.get(guri)
          .then((res) => {
            guids = res.body.data.groupIDs;
            guids.forEach((groupID) => {
              const luri = `/api/${apiVersion}/listSessionsOfGroup?apikey=${apikey}&groupID=${groupID}`;
              api.get(luri)
                  .then((res) => {
                    if (res.body.data) {
                      Object.keys(res.body.data).forEach((sessionID) => {
                        if (sessionID) {
                          console.log('Deleting', sessionID);
                          const duri = `/api/${apiVersion}/deleteSession?apikey=${apikey}&sessionID=${sessionID}`;
                          api.post(duri); // deletes
                        }
                      });
                    } else {
                      // no session in this group.
                    }
                  });
            });
          });
    });
