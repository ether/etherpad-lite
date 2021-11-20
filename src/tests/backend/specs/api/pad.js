'use strict';

/*
 * ACHTUNG: there is a copied & modified version of this file in
 * <basedir>/src/tests/container/specs/api/pad.js
 *
 * TODO: unify those two files, and merge in a single one.
 */

const assert = require('assert').strict;
const common = require('../../common');

let agent;
const apiKey = common.apiKey;
let apiVersion = 1;
const testPadId = makeid();
const newPadId = makeid();
const copiedPadId = makeid();
let lastEdited = '';
const text = generateLongText();

const endPoint = (point, version) => `/api/${version || apiVersion}/${point}?apikey=${apiKey}`;

/*
 * Html document with nested lists of different types, to test its import and
 * verify it is exported back correctly
 */
const ulHtml = '<!doctype html><html><body><ul class="bullet"><li>one</li><li>two</li><li>0</li><li>1</li><li>2<ul class="bullet"><li>3</li><li>4</li></ul></li></ul><ol class="number"><li>item<ol class="number"><li>item1</li><li>item2</li></ol></li></ol></body></html>';

/*
 * When exported back, Etherpad produces an html which is not exactly the same
 * textually, but at least it remains standard compliant and has an equal DOM
 * structure.
 */
const expectedHtml = '<!doctype html><html><body><ul class="bullet"><li>one</li><li>two</li><li>0</li><li>1</li><li>2<ul class="bullet"><li>3</li><li>4</ul></li></ul><ol start="1" class="number"><li>item<ol start="2" class="number"><li>item1</li><li>item2</ol></li></ol></body></html>';

/*
 * Html document with space between list items, to test its import and
 * verify it is exported back correctly
 */
const ulSpaceHtml = '<!doctype html><html><body><ul class="bullet"> <li>one</li></ul></body></html>';

/*
 * When exported back, Etherpad produces an html which is not exactly the same
 * textually, but at least it remains standard compliant and has an equal DOM
 * structure.
 */
const expectedSpaceHtml = '<!doctype html><html><body><ul class="bullet"><li>one</ul></body></html>';

describe(__filename, function () {
  before(async function () { agent = await common.init(); });

  describe('Sanity checks', function () {
    it('can connect', async function () {
      await agent.get('/api/')
          .expect(200)
          .expect('Content-Type', /json/);
    });

    it('finds the version tag', async function () {
      const res = await agent.get('/api/')
          .expect(200);
      apiVersion = res.body.currentVersion;
      assert(apiVersion);
    });

    it('errors with invalid APIKey', async function () {
      // This is broken because Etherpad doesn't handle HTTP codes properly see #2343
      // If your APIKey is password you deserve to fail all tests anyway
      await agent.get(`/api/${apiVersion}/createPad?apikey=password&padID=test`)
          .expect(401);
    });
  });

  /* Pad Tests Order of execution
  -> deletePad -- This gives us a guaranteed clear environment
   -> createPad
    -> getRevisions -- Should be 0
     -> getSavedRevisionsCount(padID) -- Should be 0
      -> listSavedRevisions(padID) -- Should be an empty array
       -> getHTML -- Should be the default pad text in HTML format
        -> deletePad -- Should just delete a pad
         -> getHTML -- Should return an error
          -> createPad(withText)
           -> getText -- Should have the text specified above as the pad text
            -> setText
             -> getText -- Should be the text set before
              -> getRevisions -- Should be 0 still?
               -> saveRevision
                -> getSavedRevisionsCount(padID) -- Should be 0 still?
                 -> listSavedRevisions(padID) -- Should be an empty array still ?
                  -> padUsersCount -- Should be 0
                   -> getReadOnlyId -- Should be a value
                    -> listAuthorsOfPad(padID) -- should be empty array?
                     -> getLastEdited(padID) -- Should be when pad was made
                      -> setText(padId)
                       -> getLastEdited(padID) -- Should be when setText was performed
                        -> padUsers(padID) -- Should be when setText was performed

                         -> setText(padId, "hello world")
                          -> getLastEdited(padID) -- Should be when pad was made
                           -> getText(padId) -- Should be "hello world"
                            -> movePad(padID, newPadId) -- Should provide consistent pad data
                             -> getText(newPadId) -- Should be "hello world"
                              -> movePad(newPadID, originalPadId) -- Should provide consistent pad data
                               -> getText(originalPadId) -- Should be "hello world"
                                -> getLastEdited(padID) -- Should not be 0
                                -> appendText(padID, "hello")
                                -> getText(padID) -- Should be "hello worldhello"
                                 -> setHTML(padID) -- Should fail on invalid HTML
                                  -> setHTML(padID) *3 -- Should fail on invalid HTML
                                   -> getHTML(padID) -- Should return HTML close to posted HTML
                                    -> createPad -- Tries to create pads with bad url characters

  */

  describe('Tests', function () {
    it('deletes a Pad that does not exist', async function () {
      await agent.get(`${endPoint('deletePad')}&padID=${testPadId}`)
          .expect(200) // @TODO: we shouldn't expect 200 here since the pad may not exist
          .expect('Content-Type', /json/);
    });

    it('creates a new Pad', async function () {
      const res = await agent.get(`${endPoint('createPad')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('gets revision count of Pad', async function () {
      const res = await agent.get(`${endPoint('getRevisionsCount')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
      assert.equal(res.body.data.revisions, 0);
    });

    it('gets saved revisions count of Pad', async function () {
      const res = await agent.get(`${endPoint('getSavedRevisionsCount')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
      assert.equal(res.body.data.savedRevisions, 0);
    });

    it('gets saved revision list of Pad', async function () {
      const res = await agent.get(`${endPoint('listSavedRevisions')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
      assert.deepEqual(res.body.data.savedRevisions, []);
    });

    it('get the HTML of Pad', async function () {
      const res = await agent.get(`${endPoint('getHTML')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert(res.body.data.html.length > 1);
    });

    it('list all pads', async function () {
      const res = await agent.get(endPoint('listAllPads'))
          .expect(200)
          .expect('Content-Type', /json/);
      assert(res.body.data.padIDs.includes(testPadId));
    });

    it('deletes the Pad', async function () {
      const res = await agent.get(`${endPoint('deletePad')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('list all pads again', async function () {
      const res = await agent.get(endPoint('listAllPads'))
          .expect(200)
          .expect('Content-Type', /json/);
      assert(!res.body.data.padIDs.includes(testPadId));
    });

    it('get the HTML of a Pad -- Should return a failure', async function () {
      const res = await agent.get(`${endPoint('getHTML')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 1);
    });

    it('creates a new Pad with text', async function () {
      const res = await agent.get(`${endPoint('createPad')}&padID=${testPadId}&text=testText`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('gets the Pad text and expect it to be testText with trailing \\n', async function () {
      const res = await agent.get(`${endPoint('getText')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.data.text, 'testText\n');
    });

    it('set text', async function () {
      const res = await agent.post(endPoint('setText'))
          .send({
            padID: testPadId,
            text: 'testTextTwo',
          })
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('gets the Pad text', async function () {
      const res = await agent.get(`${endPoint('getText')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.data.text, 'testTextTwo\n');
    });

    it('gets Revision Count of a Pad', async function () {
      const res = await agent.get(`${endPoint('getRevisionsCount')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.data.revisions, 1);
    });

    it('saves Revision', async function () {
      const res = await agent.get(`${endPoint('saveRevision')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('gets saved revisions count of Pad again', async function () {
      const res = await agent.get(`${endPoint('getSavedRevisionsCount')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
      assert.equal(res.body.data.savedRevisions, 1);
    });

    it('gets saved revision list of Pad again', async function () {
      const res = await agent.get(`${endPoint('listSavedRevisions')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
      assert.deepEqual(res.body.data.savedRevisions, [1]);
    });

    it('gets User Count of a Pad', async function () {
      const res = await agent.get(`${endPoint('padUsersCount')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.data.padUsersCount, 0);
    });

    it('Gets the Read Only ID of a Pad', async function () {
      const res = await agent.get(`${endPoint('getReadOnlyID')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert(res.body.data.readOnlyID);
    });

    it('Get Authors of the Pad', async function () {
      const res = await agent.get(`${endPoint('listAuthorsOfPad')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.data.authorIDs.length, 0);
    });

    it('Get When Pad was left Edited', async function () {
      const res = await agent.get(`${endPoint('getLastEdited')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert(res.body.data.lastEdited);
      lastEdited = res.body.data.lastEdited;
    });

    it('set text again', async function () {
      const res = await agent.post(endPoint('setText'))
          .send({
            padID: testPadId,
            text: 'testTextTwo',
          })
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('Get When Pad was left Edited again', async function () {
      const res = await agent.get(`${endPoint('getLastEdited')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert(res.body.data.lastEdited > lastEdited);
    });

    it('gets User Count of a Pad again', async function () {
      const res = await agent.get(`${endPoint('padUsers')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.data.padUsers.length, 0);
    });

    it('deletes a Pad', async function () {
      const res = await agent.get(`${endPoint('deletePad')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('creates the Pad again', async function () {
      const res = await agent.get(`${endPoint('createPad')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('Sets text on a pad Id', async function () {
      const res = await agent.post(`${endPoint('setText')}&padID=${testPadId}`)
          .field({text})
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('Gets text on a pad Id', async function () {
      const res = await agent.get(`${endPoint('getText')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
      assert.equal(res.body.data.text, `${text}\n`);
    });

    it('Sets text on a pad Id including an explicit newline', async function () {
      const res = await agent.post(`${endPoint('setText')}&padID=${testPadId}`)
          .field({text: `${text}\n`})
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it("Gets text on a pad Id and doesn't have an excess newline", async function () {
      const res = await agent.get(`${endPoint('getText')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
      assert.equal(res.body.data.text, `${text}\n`);
    });

    it('Gets when pad was last edited', async function () {
      const res = await agent.get(`${endPoint('getLastEdited')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.notEqual(res.body.lastEdited, 0);
    });

    it('Move a Pad to a different Pad ID', async function () {
      const res = await agent.get(
          `${endPoint('movePad')}&sourceID=${testPadId}&destinationID=${newPadId}&force=true`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('Gets text from new pad', async function () {
      const res = await agent.get(`${endPoint('getText')}&padID=${newPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.data.text, `${text}\n`);
    });

    it('Move pad back to original ID', async function () {
      const res = await agent.get(
          `${endPoint('movePad')}&sourceID=${newPadId}&destinationID=${testPadId}&force=false`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('Get text using original ID', async function () {
      const res = await agent.get(`${endPoint('getText')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.data.text, `${text}\n`);
    });

    it('Get last edit of original ID', async function () {
      const res = await agent.get(`${endPoint('getLastEdited')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.notEqual(res.body.lastEdited, 0);
    });

    it('Append text to a pad Id', async function () {
      let res = await agent.get(
          `${endPoint('appendText', '1.2.13')}&padID=${testPadId}&text=hello`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
      res = await agent.get(`${endPoint('getText')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
      assert.equal(res.body.data.text, `${text}hello\n`);
    });

    it('Sets the HTML of a Pad attempting to pass ugly HTML', async function () {
      const html = '<div><b>Hello HTML</title></head></div>';
      const res = await agent.post(endPoint('setHTML'))
          .send({
            padID: testPadId,
            html,
          })
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('Pad with complex nested lists of different types', async function () {
      let res = await agent.post(endPoint('setHTML'))
          .send({
            padID: testPadId,
            html: ulHtml,
          })
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
      res = await agent.get(`${endPoint('getHTML')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      const receivedHtml = res.body.data.html.replace('<br></body>', '</body>').toLowerCase();
      assert.equal(receivedHtml, expectedHtml);
    });

    it('Pad with white space between list items', async function () {
      let res = await agent.get(`${endPoint('setHTML')}&padID=${testPadId}&html=${ulSpaceHtml}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
      res = await agent.get(`${endPoint('getHTML')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      const receivedHtml = res.body.data.html.replace('<br></body>', '</body>').toLowerCase();
      assert.equal(receivedHtml, expectedSpaceHtml);
    });

    it('errors if pad can be created', async function () {
      await Promise.all(['/', '%23', '%3F', '%26'].map(async (badUrlChar) => {
        const res = await agent.get(`${endPoint('createPad')}&padID=${badUrlChar}`)
            .expect('Content-Type', /json/);
        assert.equal(res.body.code, 1);
      }));
    });

    it('copies the content of a existent pad', async function () {
      const res = await agent.get(
          `${endPoint('copyPad')}&sourceID=${testPadId}&destinationID=${copiedPadId}&force=true`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('does not add an useless revision', async function () {
      let res = await agent.post(`${endPoint('setText')}&padID=${testPadId}`)
          .field({text: 'identical text\n'})
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);

      res = await agent.get(`${endPoint('getText')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.data.text, 'identical text\n');

      res = await agent.get(`${endPoint('getRevisionsCount')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      const revCount = res.body.data.revisions;

      res = await agent.post(`${endPoint('setText')}&padID=${testPadId}`)
          .field({text: 'identical text\n'})
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);

      res = await agent.get(`${endPoint('getRevisionsCount')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.data.revisions, revCount);
    });
  });

  describe('copyPadWithoutHistory', function () {
    const sourcePadId = makeid();
    let newPad;

    before(async function () {
      await createNewPadWithHtml(sourcePadId, ulHtml);
    });

    beforeEach(async function () {
      newPad = makeid();
    });

    it('returns a successful response', async function () {
      const res = await agent.get(`${endPoint('copyPadWithoutHistory')}&sourceID=${sourcePadId}` +
                                  `&destinationID=${newPad}&force=false`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    // this test validates if the source pad's text and attributes are kept
    it('creates a new pad with the same content as the source pad', async function () {
      let res = await agent.get(`${endPoint('copyPadWithoutHistory')}&sourceID=${sourcePadId}` +
                                `&destinationID=${newPad}&force=false`);
      assert.equal(res.body.code, 0);
      res = await agent.get(`${endPoint('getHTML')}&padID=${newPad}`)
          .expect(200);
      const receivedHtml = res.body.data.html.replace('<br><br></body>', '</body>').toLowerCase();
      assert.equal(receivedHtml, expectedHtml);
    });

    describe('when try copy a pad with a group that does not exist', function () {
      const padId = makeid();
      const padWithNonExistentGroup = `notExistentGroup$${padId}`;
      it('throws an error', async function () {
        const res = await agent.get(`${endPoint('copyPadWithoutHistory')}` +
                                    `&sourceID=${sourcePadId}` +
                                    `&destinationID=${padWithNonExistentGroup}&force=true`)
            .expect(200);
        assert.equal(res.body.code, 1);
      });
    });

    describe('when try copy a pad and destination pad already exist', function () {
      const padIdExistent = makeid();

      before(async function () {
        await createNewPadWithHtml(padIdExistent, ulHtml);
      });

      it('force=false throws an error', async function () {
        const res = await agent.get(`${endPoint('copyPadWithoutHistory')}` +
                                    `&sourceID=${sourcePadId}` +
                                    `&destinationID=${padIdExistent}&force=false`)
            .expect(200);
        assert.equal(res.body.code, 1);
      });

      it('force=true returns a successful response', async function () {
        const res = await agent.get(`${endPoint('copyPadWithoutHistory')}` +
                                    `&sourceID=${sourcePadId}` +
                                    `&destinationID=${padIdExistent}&force=true`)
            .expect(200);
        assert.equal(res.body.code, 0);
      });
    });
  });
});

/*
                          -> movePadForce Test

*/

const createNewPadWithHtml = async (padId, html) => {
  await agent.get(`${endPoint('createPad')}&padID=${padId}`);
  await agent.post(endPoint('setHTML'))
      .send({
        padID: padId,
        html,
      });
};

function makeid() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function generateLongText() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 80000; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
