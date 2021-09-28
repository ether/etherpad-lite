'use strict';

/*
 * Import and Export tests for the /p/whateverPadId/import and /p/whateverPadId/export endpoints.
 */

const assert = require('assert').strict;
const common = require('../../common');
const fs = require('fs');
const settings = require('../../../../node/utils/Settings');
const superagent = require('superagent');
const padManager = require('../../../../node/db/PadManager');
const plugins = require('../../../../static/js/pluginfw/plugin_defs');

const padText = fs.readFileSync(`${__dirname}/test.txt`);
const etherpadDoc = fs.readFileSync(`${__dirname}/test.etherpad`);
const wordDoc = fs.readFileSync(`${__dirname}/test.doc`);
const wordXDoc = fs.readFileSync(`${__dirname}/test.docx`);
const odtDoc = fs.readFileSync(`${__dirname}/test.odt`);
const pdfDoc = fs.readFileSync(`${__dirname}/test.pdf`);

let agent;
const apiKey = common.apiKey;
const apiVersion = 1;
const testPadId = makeid();
const testPadIdEnc = encodeURIComponent(testPadId);

describe(__filename, function () {
  this.timeout(45000);
  before(async function () { agent = await common.init(); });

  describe('Connectivity', function () {
    it('can connect', async function () {
      this.timeout(250);
      await agent.get('/api/')
          .expect(200)
          .expect('Content-Type', /json/);
    });
  });

  describe('API Versioning', function () {
    it('finds the version tag', async function () {
      this.timeout(250);
      await agent.get('/api/')
          .expect(200)
          .expect((res) => assert(res.body.currentVersion));
    });
  });

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

  describe('Imports and Exports', function () {
    const backups = {};

    beforeEach(async function () {
      backups.hooks = {};
      for (const hookName of ['preAuthorize', 'authenticate', 'authorize']) {
        backups.hooks[hookName] = plugins.hooks[hookName];
        plugins.hooks[hookName] = [];
      }
      // Note: This is a shallow copy.
      backups.settings = Object.assign({}, settings);
      settings.requireAuthentication = false;
      settings.requireAuthorization = false;
      settings.users = {user: {password: 'user-password'}};
    });

    afterEach(async function () {
      Object.assign(plugins.hooks, backups.hooks);
      // Note: This does not unset settings that were added.
      Object.assign(settings, backups.settings);
    });

    it('creates a new Pad, imports content to it, checks that content', async function () {
      this.timeout(500);
      await agent.get(`${endPoint('createPad')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => assert.equal(res.body.code, 0));
      await agent.post(`/p/${testPadId}/import`)
          .attach('file', padText, {filename: '/test.txt', contentType: 'text/plain'})
          .expect(200);
      await agent.get(`${endPoint('getText')}&padID=${testPadId}`)
          .expect(200)
          .expect((res) => assert.equal(res.body.data.text, padText.toString()));
    });

    for (const authn of [false, true]) {
      it(`can export from read-only pad ID, authn ${authn}`, async function () {
        this.timeout(250);
        settings.requireAuthentication = authn;
        const get = (ep) => {
          let req = agent.get(ep);
          if (authn) req = req.auth('user', 'user-password');
          return req.expect(200);
        };
        const ro = await get(`${endPoint('getReadOnlyID')}&padID=${testPadId}`)
            .expect((res) => assert.ok(JSON.parse(res.text).data.readOnlyID));
        const readOnlyId = JSON.parse(ro.text).data.readOnlyID;
        await get(`/p/${readOnlyId}/export/html`)
            .expect((res) => assert(res.text.indexOf('This is the') !== -1));
        await get(`/p/${readOnlyId}/export/txt`)
            .expect((res) => assert(res.text.indexOf('This is the') !== -1));
      });
    }

    describe('Import/Export tests requiring AbiWord/LibreOffice', function () {
      this.timeout(10000);

      before(async function () {
        if ((!settings.abiword || settings.abiword.indexOf('/') === -1) &&
            (!settings.soffice || settings.soffice.indexOf('/') === -1)) {
          this.skip();
        }
      });

      // For some reason word import does not work in testing..
      // TODO: fix support for .doc files..
      it('Tries to import .doc that uses soffice or abiword', async function () {
        await agent.post(`/p/${testPadId}/import`)
            .attach('file', wordDoc, {filename: '/test.doc', contentType: 'application/msword'})
            .expect(200)
            .expect('Content-Type', /json/)
            .expect((res) => assert.deepEqual(res.body, {
              code: 0,
              message: 'ok',
              data: {directDatabaseAccess: false},
            }));
      });

      it('exports DOC', async function () {
        await agent.get(`/p/${testPadId}/export/doc`)
            .buffer(true).parse(superagent.parse['application/octet-stream'])
            .expect(200)
            .expect((res) => assert(res.body.length >= 9000));
      });

      it('Tries to import .docx that uses soffice or abiword', async function () {
        await agent.post(`/p/${testPadId}/import`)
            .attach('file', wordXDoc, {
              filename: '/test.docx',
              contentType:
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            })
            .expect(200)
            .expect('Content-Type', /json/)
            .expect((res) => assert.deepEqual(res.body, {
              code: 0,
              message: 'ok',
              data: {directDatabaseAccess: false},
            }));
      });

      it('exports DOC from imported DOCX', async function () {
        await agent.get(`/p/${testPadId}/export/doc`)
            .buffer(true).parse(superagent.parse['application/octet-stream'])
            .expect(200)
            .expect((res) => assert(res.body.length >= 9100));
      });

      it('Tries to import .pdf that uses soffice or abiword', async function () {
        await agent.post(`/p/${testPadId}/import`)
            .attach('file', pdfDoc, {filename: '/test.pdf', contentType: 'application/pdf'})
            .expect(200)
            .expect('Content-Type', /json/)
            .expect((res) => assert.deepEqual(res.body, {
              code: 0,
              message: 'ok',
              data: {directDatabaseAccess: false},
            }));
      });

      it('exports PDF', async function () {
        await agent.get(`/p/${testPadId}/export/pdf`)
            .buffer(true).parse(superagent.parse['application/octet-stream'])
            .expect(200)
            .expect((res) => assert(res.body.length >= 1000));
      });

      it('Tries to import .odt that uses soffice or abiword', async function () {
        await agent.post(`/p/${testPadId}/import`)
            .attach('file', odtDoc, {filename: '/test.odt', contentType: 'application/odt'})
            .expect(200)
            .expect('Content-Type', /json/)
            .expect((res) => assert.deepEqual(res.body, {
              code: 0,
              message: 'ok',
              data: {directDatabaseAccess: false},
            }));
      });

      it('exports ODT', async function () {
        await agent.get(`/p/${testPadId}/export/odt`)
            .buffer(true).parse(superagent.parse['application/octet-stream'])
            .expect(200)
            .expect((res) => assert(res.body.length >= 7000));
      });
    }); // End of AbiWord/LibreOffice tests.

    it('Tries to import .etherpad', async function () {
      this.timeout(3000);
      await agent.post(`/p/${testPadId}/import`)
          .attach('file', etherpadDoc, {
            filename: '/test.etherpad',
            contentType: 'application/etherpad',
          })
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => assert.deepEqual(res.body, {
            code: 0,
            message: 'ok',
            data: {directDatabaseAccess: true},
          }));
    });

    it('exports Etherpad', async function () {
      this.timeout(3000);
      await agent.get(`/p/${testPadId}/export/etherpad`)
          .buffer(true).parse(superagent.parse.text)
          .expect(200)
          .expect(/hello/);
    });

    it('exports HTML for this Etherpad file', async function () {
      this.timeout(3000);
      await agent.get(`/p/${testPadId}/export/html`)
          .expect(200)
          .expect('content-type', 'text/html; charset=utf-8')
          .expect(/<ul class="bullet"><li><ul class="bullet"><li>hello<\/ul><\/li><\/ul>/);
    });

    it('Tries to import unsupported file type', async function () {
      this.timeout(3000);
      settings.allowUnknownFileEnds = false;
      await agent.post(`/p/${testPadId}/import`)
          .attach('file', padText, {filename: '/test.xasdasdxx', contentType: 'weirdness/jobby'})
          .expect(400)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 1);
            assert.equal(res.body.message, 'uploadFailed');
          });
    });

    describe('Import authorization checks', function () {
      let authorize;

      const deleteTestPad = async () => {
        if (await padManager.doesPadExist(testPadId)) {
          const pad = await padManager.getPad(testPadId);
          await pad.remove();
        }
      };

      const createTestPad = async (text) => {
        const pad = await padManager.getPad(testPadId);
        if (text) await pad.setText(text);
        return pad;
      };

      this.timeout(1000);

      beforeEach(async function () {
        await deleteTestPad();
        settings.requireAuthorization = true;
        authorize = () => true;
        plugins.hooks.authorize = [{hook_fn: (hookName, {req}, cb) => cb([authorize(req)])}];
      });

      afterEach(async function () {
        await deleteTestPad();
      });

      it('!authn !exist -> create', async function () {
        await agent.post(`/p/${testPadIdEnc}/import`)
            .attach('file', padText, {filename: '/test.txt', contentType: 'text/plain'})
            .expect(200);
        assert(await padManager.doesPadExist(testPadId));
        const pad = await padManager.getPad(testPadId);
        assert.equal(pad.text(), padText.toString());
      });

      it('!authn exist -> replace', async function () {
        const pad = await createTestPad('before import');
        await agent.post(`/p/${testPadIdEnc}/import`)
            .attach('file', padText, {filename: '/test.txt', contentType: 'text/plain'})
            .expect(200);
        assert(await padManager.doesPadExist(testPadId));
        assert.equal(pad.text(), padText.toString());
      });

      it('authn anonymous !exist -> fail', async function () {
        settings.requireAuthentication = true;
        await agent.post(`/p/${testPadIdEnc}/import`)
            .attach('file', padText, {filename: '/test.txt', contentType: 'text/plain'})
            .expect(401);
        assert(!(await padManager.doesPadExist(testPadId)));
      });

      it('authn anonymous exist -> fail', async function () {
        settings.requireAuthentication = true;
        const pad = await createTestPad('before import\n');
        await agent.post(`/p/${testPadIdEnc}/import`)
            .attach('file', padText, {filename: '/test.txt', contentType: 'text/plain'})
            .expect(401);
        assert.equal(pad.text(), 'before import\n');
      });

      it('authn user create !exist -> create', async function () {
        settings.requireAuthentication = true;
        await agent.post(`/p/${testPadIdEnc}/import`)
            .auth('user', 'user-password')
            .attach('file', padText, {filename: '/test.txt', contentType: 'text/plain'})
            .expect(200);
        assert(await padManager.doesPadExist(testPadId));
        const pad = await padManager.getPad(testPadId);
        assert.equal(pad.text(), padText.toString());
      });

      it('authn user modify !exist -> fail', async function () {
        settings.requireAuthentication = true;
        authorize = () => 'modify';
        await agent.post(`/p/${testPadIdEnc}/import`)
            .auth('user', 'user-password')
            .attach('file', padText, {filename: '/test.txt', contentType: 'text/plain'})
            .expect(403);
        assert(!(await padManager.doesPadExist(testPadId)));
      });

      it('authn user readonly !exist -> fail', async function () {
        settings.requireAuthentication = true;
        authorize = () => 'readOnly';
        await agent.post(`/p/${testPadIdEnc}/import`)
            .auth('user', 'user-password')
            .attach('file', padText, {filename: '/test.txt', contentType: 'text/plain'})
            .expect(403);
        assert(!(await padManager.doesPadExist(testPadId)));
      });

      it('authn user create exist -> replace', async function () {
        settings.requireAuthentication = true;
        const pad = await createTestPad('before import\n');
        await agent.post(`/p/${testPadIdEnc}/import`)
            .auth('user', 'user-password')
            .attach('file', padText, {filename: '/test.txt', contentType: 'text/plain'})
            .expect(200);
        assert.equal(pad.text(), padText.toString());
      });

      it('authn user modify exist -> replace', async function () {
        settings.requireAuthentication = true;
        authorize = () => 'modify';
        const pad = await createTestPad('before import\n');
        await agent.post(`/p/${testPadIdEnc}/import`)
            .auth('user', 'user-password')
            .attach('file', padText, {filename: '/test.txt', contentType: 'text/plain'})
            .expect(200);
        assert.equal(pad.text(), padText.toString());
      });

      it('authn user readonly exist -> fail', async function () {
        const pad = await createTestPad('before import\n');
        settings.requireAuthentication = true;
        authorize = () => 'readOnly';
        await agent.post(`/p/${testPadIdEnc}/import`)
            .auth('user', 'user-password')
            .attach('file', padText, {filename: '/test.txt', contentType: 'text/plain'})
            .expect(403);
        assert.equal(pad.text(), 'before import\n');
      });
    });
  });
}); // End of tests.


const endPoint = (point, version) => {
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
