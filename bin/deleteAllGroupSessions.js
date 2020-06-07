/*
* A tool for deleting ALL GROUP sessions Etherpad user sessions from the CLI,
* because sometimes a brick is required to fix a face.
*/

const request = require('../src/node_modules/request');
const settings = require(__dirname+'/../tests/container/loadSettings').loadSettings();
const supertest = require(__dirname+'/../src/node_modules/supertest');
const api = supertest('http://'+settings.ip+":"+settings.port);
const path = require('path');
const fs = require('fs');

// get the API Key
var filePath = path.join(__dirname, '../APIKEY.txt');
var apikey = fs.readFileSync(filePath,  {encoding: 'utf-8'});

// Set apiVersion to base value, we change this later.
var apiVersion = 1;
var guids;

// Update the apiVersion
api.get('/api/')
.expect(function(res){
  apiVersion = res.body.currentVersion;
  if (!res.body.currentVersion) throw new Error("No version set in API");
  return;
})
.then(function(){
  let guri = '/api/'+apiVersion+'/listAllGroups?apikey='+apikey;
  api.get(guri)
  .then(function(res){
    guids = res.body.data.groupIDs;
    guids.forEach(function(groupID){
      let luri = '/api/'+apiVersion+'/listSessionsOfGroup?apikey='+apikey + "&groupID="+groupID;
      api.get(luri)
      .then(function(res){
        if(res.body.data){
          Object.keys(res.body.data).forEach(function(sessionID){
            if(sessionID){
              console.log("Deleting", sessionID);
              let duri = '/api/'+apiVersion+'/deleteSession?apikey='+apikey + "&sessionID="+sessionID;
              api.post(duri); // deletes
            }
          })
        }else{
          // no session in this group.
        }
      })
    })
  })
})
