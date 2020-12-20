'use strict';
/*
 * ACHTUNG: there is a copied & modified version of this file in
 * <basedir>/tests/container/spacs/api/pad.js
 *
 * TODO: unify those two files, and merge in a single one.
 */

/* eslint-disable max-len */

const common = require('../../common');
const supertest = require(`${__dirname}/../../../../src/node_modules/supertest`);
const settings = require(`${__dirname}/../../../../tests/container/loadSettings.js`).loadSettings();
const api = supertest(`http://${settings.ip}:${settings.port}`);

const apiKey = common.apiKey;
const apiVersion = 1;

const testImports = {
  'malformed': {
    input: '<html><body><li>wtf</ul></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>wtf<br><br></body></html>',
    expectedText: 'wtf\n\n',
  },
  'nonelistiteminlist #3620': {
    input: '<html><body><ul>test<li>FOO</li></ul></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><ul class="bullet">test<li>FOO</ul><br></body></html>',
    expectedText: '\ttest\n\t* FOO\n\n',
  },
  'whitespaceinlist #3620': {
    input: '<html><body><ul> <li>FOO</li></ul></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><ul class="bullet"><li>FOO</ul><br></body></html>',
    expectedText: '\t* FOO\n\n',
  },
  'prefixcorrectlinenumber': {
    input: '<html><body><ol><li>should be 1</li><li>should be 2</li></ol></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><ol start="1" class="number"><li>should be 1</li><li>should be 2</ol><br></body></html>',
    expectedText: '\t1. should be 1\n\t2. should be 2\n\n',
  },
  'prefixcorrectlinenumbernested': {
    input: '<html><body><ol><li>should be 1</li><ol><li>foo</li></ol><li>should be 2</li></ol></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><ol start="1" class="number"><li>should be 1<ol start="2" class="number"><li>foo</ol><li>should be 2</ol><br></body></html>',
    expectedText: '\t1. should be 1\n\t\t1.1. foo\n\t2. should be 2\n\n',
  },

  /*
  "prefixcorrectlinenumber when introduced none list item - currently not supported see #3450":{
    input: '<html><body><ol><li>should be 1</li>test<li>should be 2</li></ol></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><ol start="1" class="number"><li>should be 1</li>test<li>should be 2</li></ol><br></body></html>',
    expectedText: '\t1. should be 1\n\ttest\n\t2. should be 2\n\n'
  }
  ,
  "newlinesshouldntresetlinenumber #2194":{
    input: '<html><body><ol><li>should be 1</li>test<li>should be 2</li></ol></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><ol class="number"><li>should be 1</li>test<li>should be 2</li></ol><br></body></html>',
    expectedText: '\t1. should be 1\n\ttest\n\t2. should be 2\n\n'
  }
  */
  'ignoreAnyTagsOutsideBody': {
    description: 'Content outside body should be ignored',
    input: '<html><head><title>title</title><style></style></head><body>empty<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>empty<br><br></body></html>',
    expectedText: 'empty\n\n',
  },
  'indentedListsAreNotBullets': {
    description: 'Indented lists are represented with tabs and without bullets',
    input: '<html><body><ul class="indent"><li>indent</li><li>indent</ul></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><ul class="indent"><li>indent</li><li>indent</ul><br></body></html>',
    expectedText: '\tindent\n\tindent\n\n'
  }
};

describe(__filename, function () {
  Object.keys(testImports).forEach((testName) => {
    const testPadId = makeid();
    const test = testImports[testName];
    if (test.disabled) {
      return xit(`DISABLED: ${testName}`, function (done) {
        done();
      });
    }
    describe(`createPad ${testName}`, function () {
      it('creates a new Pad', function (done) {
        api.get(`${endPoint('createPad')}&padID=${testPadId}`)
            .expect((res) => {
              if (res.body.code !== 0) throw new Error('Unable to create new Pad');
            })
            .expect('Content-Type', /json/)
            .expect(200, done);
      });
    });

    describe(`setHTML ${testName}`, function () {
      it('Sets the HTML', function (done) {
        api.get(`${endPoint('setHTML')}&padID=${testPadId}&html=${encodeURIComponent(test.input)}`)
            .expect((res) => {
              if (res.body.code !== 0) throw new Error(`Error:${testName}`);
            })
            .expect('Content-Type', /json/)
            .expect(200, done);
      });
    });

    describe(`getHTML ${testName}`, function () {
      it('Gets back the HTML of a Pad', function (done) {
        api.get(`${endPoint('getHTML')}&padID=${testPadId}`)
            .expect((res) => {
              const receivedHtml = res.body.data.html;
              if (receivedHtml !== test.expectedHTML) {
                throw new Error(`HTML received from export is not the one we were expecting.
             Test Name:
             ${testName}

             Received:
             ${JSON.stringify(receivedHtml)}

             Expected:
             ${JSON.stringify(test.expectedHTML)}

             Which is a different version of the originally imported one:
             ${test.input}`);
              }
            })
            .expect('Content-Type', /json/)
            .expect(200, done);
      });
    });

    describe(`getText ${testName}`, function () {
      it('Gets back the Text of a Pad', function (done) {
        api.get(`${endPoint('getText')}&padID=${testPadId}`)
            .expect((res) => {
              const receivedText = res.body.data.text;
              if (receivedText !== test.expectedText) {
                throw new Error(`Text received from export is not the one we were expecting.
             Test Name:
             ${testName}

             Received:
             ${JSON.stringify(receivedText)}

             Expected:
             ${JSON.stringify(test.expectedText)}

             Which is a different version of the originally imported one:
             ${test.input}`);
              }
            })
            .expect('Content-Type', /json/)
            .expect(200, done);
      });
    });
  });
});


function endPoint(point, version) {
  version = version || apiVersion;
  return `/api/${version}/${point}?apikey=${apiKey}`;
};

function makeid() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
