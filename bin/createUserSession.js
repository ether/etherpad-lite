/*
 * A tool for generating a test user session which can be used for debugging configs
 * that require sessions.
 */
const m = (f) => __dirname + '/../' + f;

const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const request = require(m('src/node_modules/request'));
const settings = require(m('src/node/utils/Settings'));
const supertest = require(m('src/node_modules/supertest'));

(async () => {
  const api = supertest('http://'+settings.ip+':'+settings.port);

  const filePath = path.join(__dirname, '../APIKEY.txt');
  const apikey = fs.readFileSync(filePath,  {encoding: 'utf-8'});

  let res;

  res = await api.get('/api/');
  const apiVersion = res.body.currentVersion;
  if (!apiVersion) throw new Error('No version set in API');
  const uri = (cmd, args) => `/api/${apiVersion}/${cmd}?${querystring.stringify(args)}`;

  res = await api.post(uri('createGroup', {apikey}));
  if (res.body.code === 1) throw new Error(`Error creating group: ${res.body}`);
  const groupID = res.body.data.groupID;
  console.log('groupID', groupID);

  res = await api.post(uri('createGroupPad', {apikey, groupID}));
  if (res.body.code === 1) throw new Error(`Error creating group pad: ${res.body}`);
  console.log('Test Pad ID ====> ', res.body.data.padID);

  res = await api.post(uri('createAuthor', {apikey}));
  if (res.body.code === 1) throw new Error(`Error creating author: ${res.body}`);
  const authorID = res.body.data.authorID;
  console.log('authorID', authorID);

  const validUntil = Math.floor(new Date() / 1000) + 60000;
  console.log('validUntil', validUntil);
  res = await api.post(uri('createSession', {apikey, groupID, authorID, validUntil}));
  if (res.body.code === 1) throw new Error(`Error creating session: ${res.body}`);
  console.log('Session made: ====> create a cookie named sessionID and set the value to',
              res.body.data.sessionID);
})();
