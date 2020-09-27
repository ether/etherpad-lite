/*
 * Import and Export tests for the /p/whateverPadId/import and /p/whateverPadId/export endpoints.
 */

const assert = require('assert').strict;
const superagent = require(__dirname+'/../../../../src/node_modules/superagent');
const supertest = require(__dirname+'/../../../../src/node_modules/supertest');
const fs = require('fs');
const settings = require(__dirname+'/../../../../src/node/utils/Settings');
const host = 'http://127.0.0.1:'+settings.port;
const agent = supertest(`http://${settings.ip}:${settings.port}`);
const path = require('path');
const padText = fs.readFileSync("../tests/backend/specs/api/test.txt");
const etherpadDoc = fs.readFileSync("../tests/backend/specs/api/test.etherpad");
const wordDoc = fs.readFileSync("../tests/backend/specs/api/test.doc");
const wordXDoc = fs.readFileSync("../tests/backend/specs/api/test.docx");
const odtDoc = fs.readFileSync("../tests/backend/specs/api/test.odt");
const pdfDoc = fs.readFileSync("../tests/backend/specs/api/test.pdf");
var filePath = path.join(__dirname, '../../../../APIKEY.txt');

var apiKey = fs.readFileSync(filePath,  {encoding: 'utf-8'});
apiKey = apiKey.replace(/\n$/, "");
var apiVersion = 1;
var testPadId = makeid();

describe('Connectivity', function(){
  it('can connect', async function() {
    await agent.get('/api/')
        .expect(200)
        .expect('Content-Type', /json/);
  });
})

describe('API Versioning', function(){
  it('finds the version tag', async function() {
    await agent.get('/api/')
        .expect(200)
        .expect((res) => assert(res.body.currentVersion));
  });
})

/*
Tests
-----

Test.
  / Create a pad
  / Set pad contents
  / Try export pad in various formats
  / Get pad contents and ensure it matches imported contents

Test.
  / Try to export a pad that doesn't exist // Expect failure

Test.
  / Try to import an unsupported file to a pad that exists

-- TODO: Test.
  Try to import to a file and abort it half way through

Test.
  Try to import to files of varying size.

Example Curl command for testing import URI:
  curl -s -v --form file=@/home/jose/test.txt http://127.0.0.1:9001/p/foo/import
*/

describe('Imports and Exports', function(){
  before(function() {
    if (!settings.allowAnyoneToImport) {
      console.warn('not anyone can import so not testing -- ' +
                   'to include this test set allowAnyoneToImport to true in settings.json');
      this.skip();
    }
  });

  it('creates a new Pad, imports content to it, checks that content', async function() {
    await agent.get(endPoint('createPad') + `&padID=${testPadId}`)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => assert.equal(res.body.code, 0));
    await agent.post(`/p/${testPadId}/import`)
        .attach('file', padText, {filename: '/test.txt', contentType: 'text/plain'})
        .expect(200);
    await agent.get(endPoint('getText') + `&padID=${testPadId}`)
        .expect(200)
        .expect((res) => assert.equal(res.body.data.text, padText.toString()));
  });

  it('gets read only pad Id and exports the html and text for this pad', async function(){
    let ro = await agent.get(endPoint('getReadOnlyID')+"&padID="+testPadId)
        .expect(200)
        .expect((res) => assert.ok(JSON.parse(res.text).data.readOnlyID));
    let readOnlyId = JSON.parse(ro.text).data.readOnlyID;

    await agent.get(`/p/${readOnlyId}/export/html`)
        .expect(200)
        .expect((res) => assert(res.text.indexOf("This is the") !== -1));

    await agent.get(`/p/${readOnlyId}/export/txt`)
        .expect(200)
        .expect((res) => assert(res.text.indexOf("This is the") !== -1));
  });


  describe('Import/Export tests requiring AbiWord/LibreOffice', function() {
    before(function() {
      if ((!settings.abiword || settings.abiword.indexOf('/') === -1) &&
          (!settings.soffice || settings.soffice.indexOf('/') === -1)) {
        this.skip();
      }
    });

    // For some reason word import does not work in testing..
    // TODO: fix support for .doc files..
    it('Tries to import .doc that uses soffice or abiword', async function() {
      await agent.post(`/p/${testPadId}/import`)
          .attach('file', wordDoc, {filename: '/test.doc', contentType: 'application/msword'})
          .expect(200)
          .expect(/FrameCall\('undefined', 'ok'\);/);
    });

    it('exports DOC', async function() {
      await agent.get(`/p/${testPadId}/export/doc`)
          .buffer(true).parse(superagent.parse['application/octet-stream'])
          .expect(200)
          .expect((res) => assert(res.body.length >= 9000));
    });

    it('Tries to import .docx that uses soffice or abiword', async function() {
      await agent.post(`/p/${testPadId}/import`)
          .attach('file', wordXDoc, {
            filename: '/test.docx',
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          })
          .expect(200)
          .expect(/FrameCall\('undefined', 'ok'\);/);
    });

    it('exports DOC from imported DOCX', async function() {
      await agent.get(`/p/${testPadId}/export/doc`)
          .buffer(true).parse(superagent.parse['application/octet-stream'])
          .expect(200)
          .expect((res) => assert(res.body.length >= 9100));
    });

    it('Tries to import .pdf that uses soffice or abiword', async function() {
      await agent.post(`/p/${testPadId}/import`)
          .attach('file', pdfDoc, {filename: '/test.pdf', contentType: 'application/pdf'})
          .expect(200)
          .expect(/FrameCall\('undefined', 'ok'\);/);
    });

    it('exports PDF', async function() {
      await agent.get(`/p/${testPadId}/export/pdf`)
          .buffer(true).parse(superagent.parse['application/octet-stream'])
          .expect(200)
          .expect((res) => assert(res.body.length >= 1000));
    });

    it('Tries to import .odt that uses soffice or abiword', async function() {
      await agent.post(`/p/${testPadId}/import`)
          .attach('file', odtDoc, {filename: '/test.odt', contentType: 'application/odt'})
          .expect(200)
          .expect(/FrameCall\('undefined', 'ok'\);/);
    });

    it('exports ODT', async function() {
      await agent.get(`/p/${testPadId}/export/odt`)
          .buffer(true).parse(superagent.parse['application/octet-stream'])
          .expect(200)
          .expect((res) => assert(res.body.length >= 7000));
    });

  }); // End of AbiWord/LibreOffice tests.

  it('Tries to import .etherpad', async function() {
    await agent.post(`/p/${testPadId}/import`)
        .attach('file', etherpadDoc, {
          filename: '/test.etherpad',
          contentType: 'application/etherpad',
        })
        .expect(200)
        .expect(/FrameCall\('true', 'ok'\);/);
  });

  it('exports Etherpad', async function() {
    await agent.get(`/p/${testPadId}/export/etherpad`)
        .buffer(true).parse(superagent.parse.text)
        .expect(200)
        .expect(/hello/);
  });

  it('exports HTML for this Etherpad file', async function() {
    await agent.get(`/p/${testPadId}/export/html`)
        .expect(200)
        .expect('content-type', 'text/html; charset=utf-8')
        .expect(/<ul class="bullet"><li><ul class="bullet"><li>hello<\/ul><\/li><\/ul>/);
  });

  it('tries to import Plain Text to a pad that does not exist', async function() {
    const padId = testPadId + testPadId + testPadId;
    await agent.post(`/p/${padId}/import`)
        .attach('file', padText, {filename: '/test.txt', contentType: 'text/plain'})
        .expect(405);
    await agent.get(endPoint('getText') + `&padID=${padId}`)
        .expect(200)
        .expect((res) => assert.equal(res.body.code, 1));
  });

  it('Tries to import unsupported file type', async function() {
    if (settings.allowUnknownFileEnds === true) {
      console.log('skipping test because allowUnknownFileEnds is true');
      return this.skip();
    }
    await agent.post(`/p/${testPadId}/import`)
        .attach('file', padText, {filename: '/test.xasdasdxx', contentType: 'weirdness/jobby'})
        .expect(200)
        .expect((res) => assert.doesNotMatch(res.text, /FrameCall\('undefined', 'ok'\);/));
  });

}); // End of tests.





var endPoint = function(point, version){
  version = version || apiVersion;
  return `/api/${version}/${point}?apikey=${apiKey}`;
}

function makeid()
{
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for( var i=0; i < 5; i++ ){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
