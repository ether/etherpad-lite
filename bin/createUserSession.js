/*
 * A tool for generating a test user session which can be used for debugging configs
 * that require sessions.
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

// Update the apiVersion
api.get('/api/')
  .expect(function(res){
    apiVersion = res.body.currentVersion;
    if (!res.body.currentVersion) throw new Error("No version set in API");
    return;
  })
  .end(function(err, res){
    // Now we know the latest API version, let's create a group
    var uri = '/api/'+apiVersion+'/createGroup?apikey='+apikey;
    api.post(uri)
      .expect(function(res){
        if (res.body.code === 1){
          console.error("Error creating group", res.body);
        }else{
          var groupID = res.body.data.groupID;
          console.log("groupID", groupID);

          // creating a group pad
          api.post('/api/'+apiVersion+'/createGroupPad?apikey='+apikey+'&groupID='+groupID)
          .expect(function(res){
            if (res.body.code === 1){
              console.error("Error creating author", res.body);
            }else{
              console.log("Test Pad ID ====> ", res.body.data.padID)
            }
          }).end(function(){})

          // create an author
          api.post('/api/'+apiVersion+'/createAuthor?apikey='+apikey)
          .expect(function(res){
            if (res.body.code === 1){
              console.error("Error creating author", res.body);
            }else{
              console.log("authorID", res.body.data.authorID)
              var authorID = res.body.data.authorID;
              // create a session for this authorID
              var validUntil = Math.floor(new Date() / 1000) + 60000;
              console.log("validUntil", validUntil)
              api.post('/api/'+apiVersion+'/createSession?apikey='+apikey + '&groupID='+groupID+'&authorID='+authorID+'&validUntil='+validUntil)
              .expect(function(res){
                if (res.body.code === 1){
                  console.error("Error creating author", res.body);
                }else{
                  console.log("Session made: ====> create a cookie named sessionID and set it's value to ", res.body.data.sessionID);
                }
              })
              .end(function(){}) // I shouldn't have nested but here we are..  it's not too ugly :P

            }
          })
          .end(function(){})

        }
        return;
      })
      .end(function(){})
  });
// end
