/*
 * Fuzz testing the import endpoint
 * Usage: node fuzzImportTest.js
 */
const common = require('./common');
const host = `http://${settings.ip}:${settings.port}`;
const request = require('request');
const froth = require('mocha-froth');
const settings = require('../container/loadSettings').loadSettings();

const apiKey = common.apiKey;
const apiVersion = 1;
const testPadId = `TEST_fuzz${makeid()}`;

const endPoint = function (point, version) {
  version = version || apiVersion;
  return `/api/${version}/${point}?apikey=${apiKey}`;
};

console.log('Testing against padID', testPadId);
console.log(`To watch the test live visit ${host}/p/${testPadId}`);
console.log('Tests will start in 5 seconds, click the URL now!');

setTimeout(() => {
  for (let i = 1; i < 1000000; i++) { // 1M runs
    setTimeout(() => {
      runTest(i);
    }, i * 100); // 100 ms
  }
}, 5000); // wait 5 seconds

function runTest(number) {
  request(`${host + endPoint('createPad')}&padID=${testPadId}`, (err, res, body) => {
    const req = request.post(`${host}/p/${testPadId}/import`, (err, res, body) => {
      if (err) {
        throw new Error('FAILURE', err);
      } else {
        console.log('Success');
      }
    });

    let fN = '/test.txt';
    let cT = 'text/plain';

    // To be more aggressive every other test we mess with Etherpad
    // We provide a weird file name and also set a weird contentType
    if (number % 2 == 0) {
      fN = froth().toString();
      cT = froth().toString();
    }

    const form = req.form();
    form.append('file', froth().toString(), {
      filename: fN,
      contentType: cT,
    });
  });
}

function makeid() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
