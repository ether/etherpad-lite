'use strict';

/*
 * ACHTUNG: there is a copied & modified version of this file in
 * <basedir>/src/tests/container/specs/api/pad.js
 *
 * TODO: unify those two files, and merge in a single one.
 */

const assert = require('assert').strict;
const async = require('async');
const common = require('../../common');

let agent;
const apiKey = common.apiKey;
let apiVersion = 1;
const testPadId = makeid();
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

  describe('Connectivity', function () {
    it('can connect', function (done) {
      this.timeout(200);
      agent.get('/api/')
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('API Versioning', function () {
    it('finds the version tag', function (done) {
      this.timeout(150);
      agent.get('/api/')
          .expect((res) => {
            apiVersion = res.body.currentVersion;
            if (!res.body.currentVersion) throw new Error('No version set in API');
            return;
          })
          .expect(200, done);
    });
  });

  describe('Permission', function () {
    it('errors with invalid APIKey', function (done) {
      this.timeout(150);
      // This is broken because Etherpad doesn't handle HTTP codes properly see #2343
      // If your APIKey is password you deserve to fail all tests anyway
      const permErrorURL = `/api/${apiVersion}/createPad?apikey=password&padID=test`;
      agent.get(permErrorURL)
          .expect(401, done);
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

  describe('deletePad', function () {
    it('deletes a Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('deletePad')}&padID=${testPadId}`)
          .expect('Content-Type', /json/)
          .expect(200, done); // @TODO: we shouldn't expect 200 here since the pad may not exist
    });
  });

  describe('createPad', function () {
    it('creates a new Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('createPad')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Unable to create new Pad');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getRevisionsCount', function () {
    it('gets revision count of Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getRevisionsCount')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Unable to get Revision Count');
            if (res.body.data.revisions !== 0) throw new Error('Incorrect Revision Count');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getSavedRevisionsCount', function () {
    it('gets saved revisions count of Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getSavedRevisionsCount')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Unable to get Saved Revisions Count');
            if (res.body.data.savedRevisions !== 0) {
              throw new Error('Incorrect Saved Revisions Count');
            }
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('listSavedRevisions', function () {
    it('gets saved revision list of Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('listSavedRevisions')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Unable to get Saved Revisions List');
            assert.deepEqual(res.body.data.savedRevisions, []);
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getHTML', function () {
    it('get the HTML of Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getHTML')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.data.html.length <= 1) throw new Error('Unable to get the HTML');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('listAllPads', function () {
    it('list all pads', function (done) {
      this.timeout(150);
      agent.get(endPoint('listAllPads'))
          .expect((res) => {
            if (res.body.data.padIDs.includes(testPadId) !== true) {
              throw new Error('Unable to find pad in pad list');
            }
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('deletePad', function () {
    it('deletes a Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('deletePad')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Pad Deletion failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('listAllPads', function () {
    it('list all pads', function (done) {
      this.timeout(150);
      agent.get(endPoint('listAllPads'))
          .expect((res) => {
            if (res.body.data.padIDs.includes(testPadId) !== false) {
              throw new Error('Test pad should not be in pads list');
            }
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getHTML', function () {
    it('get the HTML of a Pad -- Should return a failure', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getHTML')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 1) throw new Error('Pad deletion failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('createPad', function () {
    it('creates a new Pad with text', function (done) {
      this.timeout(200);
      agent.get(`${endPoint('createPad')}&padID=${testPadId}&text=testText`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Pad Creation failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getText', function () {
    it('gets the Pad text and expect it to be testText with \n which is a line break', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getText')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.data.text !== 'testText\n') throw new Error('Pad Creation with text');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('setText', function () {
    it('creates a new Pad with text', function (done) {
      this.timeout(200);
      agent.post(endPoint('setText'))
          .send({
            padID: testPadId,
            text: 'testTextTwo',
          })
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Pad setting text failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getText', function () {
    it('gets the Pad text', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getText')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.data.text !== 'testTextTwo\n') throw new Error('Setting Text');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getRevisionsCount', function () {
    it('gets Revision Count of a Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getRevisionsCount')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.data.revisions !== 1) throw new Error('Unable to get text revision count');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('saveRevision', function () {
    it('saves Revision', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('saveRevision')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Unable to save Revision');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getSavedRevisionsCount', function () {
    it('gets saved revisions count of Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getSavedRevisionsCount')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Unable to get Saved Revisions Count');
            if (res.body.data.savedRevisions !== 1) {
              throw new Error('Incorrect Saved Revisions Count');
            }
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('listSavedRevisions', function () {
    it('gets saved revision list of Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('listSavedRevisions')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Unable to get Saved Revisions List');
            assert.deepEqual(res.body.data.savedRevisions, [1]);
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });
  describe('padUsersCount', function () {
    it('gets User Count of a Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('padUsersCount')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.data.padUsersCount !== 0) throw new Error('Incorrect Pad User count');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getReadOnlyID', function () {
    it('Gets the Read Only ID of a Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getReadOnlyID')}&padID=${testPadId}`)
          .expect((res) => {
            if (!res.body.data.readOnlyID) throw new Error('No Read Only ID for Pad');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('listAuthorsOfPad', function () {
    it('Get Authors of the Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('listAuthorsOfPad')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.data.authorIDs.length !== 0) {
              throw new Error('# of Authors of pad is not 0');
            }
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getLastEdited', function () {
    it('Get When Pad was left Edited', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getLastEdited')}&padID=${testPadId}`)
          .expect((res) => {
            if (!res.body.data.lastEdited) {
              throw new Error('# of Authors of pad is not 0');
            } else {
              lastEdited = res.body.data.lastEdited;
            }
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('setText', function () {
    it('creates a new Pad with text', function (done) {
      this.timeout(200);
      agent.post(endPoint('setText'))
          .send({
            padID: testPadId,
            text: 'testTextTwo',
          })
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Pad setting text failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getLastEdited', function () {
    it('Get When Pad was left Edited', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getLastEdited')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.data.lastEdited <= lastEdited) {
              throw new Error('Editing A Pad is not updating when it was last edited');
            }
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('padUsers', function () {
    it('gets User Count of a Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('padUsers')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.data.padUsers.length !== 0) throw new Error('Incorrect Pad Users');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('deletePad', function () {
    it('deletes a Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('deletePad')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Pad Deletion failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  const newPadId = makeid();
  const copiedPadId = makeid();

  describe('createPad', function () {
    it('creates a new Pad with text', function (done) {
      this.timeout(200);
      agent.get(`${endPoint('createPad')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Pad Creation failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('setText', function () {
    it('Sets text on a pad Id', function (done) {
      this.timeout(150);
      agent.post(`${endPoint('setText')}&padID=${testPadId}`)
          .field({text})
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Pad Set Text failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getText', function () {
    it('Gets text on a pad Id', function (done) {
      this.timeout(200);
      agent.get(`${endPoint('getText')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Pad Get Text failed');
            if (res.body.data.text !== `${text}\n`) throw new Error('Pad Text not set properly');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('setText', function () {
    it('Sets text on a pad Id including an explicit newline', function (done) {
      this.timeout(200);
      agent.post(`${endPoint('setText')}&padID=${testPadId}`)
          .field({text: `${text}\n`})
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Pad Set Text failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getText', function () {
    it("Gets text on a pad Id and doesn't have an excess newline", function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getText')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Pad Get Text failed');
            if (res.body.data.text !== `${text}\n`) throw new Error('Pad Text not set properly');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getLastEdited', function () {
    it('Gets when pad was last edited', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getLastEdited')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.lastEdited === 0) throw new Error('Get Last Edited Failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('movePad', function () {
    it('Move a Pad to a different Pad ID', function (done) {
      this.timeout(200);
      agent.get(`${endPoint('movePad')}&sourceID=${testPadId}&destinationID=${newPadId}&force=true`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Moving Pad Failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getText', function () {
    it('Gets text on a pad Id', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getText')}&padID=${newPadId}`)
          .expect((res) => {
            if (res.body.data.text !== `${text}\n`) throw new Error('Pad Get Text failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('movePad', function () {
    it('Move a Pad to a different Pad ID', function (done) {
      this.timeout(200);
      agent.get(`${endPoint('movePad')}&sourceID=${newPadId}&destinationID=${testPadId}` +
                '&force=false')
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Moving Pad Failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getText', function () {
    it('Gets text on a pad Id', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getText')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.data.text !== `${text}\n`) throw new Error('Pad Get Text failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getLastEdited', function () {
    it('Gets when pad was last edited', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getLastEdited')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.lastEdited === 0) throw new Error('Get Last Edited Failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('appendText', function () {
    it('Append text to a pad Id', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('appendText', '1.2.13')}&padID=${testPadId}&text=hello`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Pad Append Text failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getText', function () {
    it('Gets text on a pad Id', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getText')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Pad Get Text failed');
            if (res.body.data.text !== `${text}hello\n`) {
              throw new Error('Pad Text not set properly');
            }
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });


  describe('setHTML', function () {
    it('Sets the HTML of a Pad attempting to pass ugly HTML', function (done) {
      this.timeout(200);
      const html = '<div><b>Hello HTML</title></head></div>';
      agent.post(endPoint('setHTML'))
          .send({
            padID: testPadId,
            html,
          })
          .expect((res) => {
            if (res.body.code !== 0) {
              throw new Error("Crappy HTML Can't be Imported[we weren't able to sanitize it']");
            }
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('setHTML', function () {
    it('Sets the HTML of a Pad with complex nested lists of different types', function (done) {
      this.timeout(200);
      agent.post(endPoint('setHTML'))
          .send({
            padID: testPadId,
            html: ulHtml,
          })
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('List HTML cant be imported');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getHTML', function () {
    it('Gets back the HTML of a Pad with complex nested lists of different types', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getHTML')}&padID=${testPadId}`)
          .expect((res) => {
            const receivedHtml = res.body.data.html.replace('<br></body>', '</body>').toLowerCase();

            if (receivedHtml !== expectedHtml) {
              throw new Error(`HTML received from export is not the one we were expecting.
           Received:
           ${receivedHtml}

           Expected:
           ${expectedHtml}

           Which is a slightly modified version of the originally imported one:
           ${ulHtml}`);
            }
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('setHTML', function () {
    it('Sets the HTML of a Pad with white space between list items', function (done) {
      this.timeout(200);
      agent.get(`${endPoint('setHTML')}&padID=${testPadId}&html=${ulSpaceHtml}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('List HTML cant be imported');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getHTML', function () {
    it('Gets back the HTML of a Pad with complex nested lists of different types', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('getHTML')}&padID=${testPadId}`)
          .expect((res) => {
            const receivedHtml = res.body.data.html.replace('<br></body>', '</body>').toLowerCase();
            if (receivedHtml !== expectedSpaceHtml) {
              throw new Error(`HTML received from export is not the one we were expecting.
           Received:
           ${receivedHtml}

           Expected:
           ${expectedSpaceHtml}

           Which is a slightly modified version of the originally imported one:
           ${ulSpaceHtml}`);
            }
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('createPad', function () {
    it('errors if pad can be created', function (done) {
      this.timeout(150);
      const badUrlChars = ['/', '%23', '%3F', '%26'];
      async.map(
          badUrlChars,
          (badUrlChar, cb) => {
            agent.get(`${endPoint('createPad')}&padID=${badUrlChar}`)
                .expect((res) => {
                  if (res.body.code !== 1) throw new Error('Pad with bad characters was created');
                })
                .expect('Content-Type', /json/)
                .end(cb);
          },
          done);
    });
  });

  describe('copyPad', function () {
    it('copies the content of a existent pad', function (done) {
      this.timeout(200);
      agent.get(`${endPoint('copyPad')}&sourceID=${testPadId}&destinationID=${copiedPadId}` +
                '&force=true')
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Copy Pad Failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('copyPadWithoutHistory', function () {
    const sourcePadId = makeid();
    let newPad;

    before(function (done) {
      createNewPadWithHtml(sourcePadId, ulHtml, done);
    });

    beforeEach(async function () {
      newPad = makeid();
    });

    it('returns a successful response', function (done) {
      this.timeout(200);
      agent.get(`${endPoint('copyPadWithoutHistory')}&sourceID=${sourcePadId}` +
                `&destinationID=${newPad}&force=false`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Copy Pad Without History Failed');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });

    // this test validates if the source pad's text and attributes are kept
    it('creates a new pad with the same content as the source pad', function (done) {
      this.timeout(200);
      agent.get(`${endPoint('copyPadWithoutHistory')}&sourceID=${sourcePadId}` +
                `&destinationID=${newPad}&force=false`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Copy Pad Without History Failed');
          })
          .end(() => {
            agent.get(`${endPoint('getHTML')}&padID=${newPad}`)
                .expect((res) => {
                  const receivedHtml =
                      res.body.data.html.replace('<br><br></body>', '</body>').toLowerCase();

                  if (receivedHtml !== expectedHtml) {
                    throw new Error(`HTML received from export is not the one we were expecting.
                 Received:
                 ${receivedHtml}

                 Expected:
                 ${expectedHtml}

                 Which is a slightly modified version of the originally imported one:
                 ${ulHtml}`);
                  }
                })
                .expect(200, done);
          });
    });

    context('when try copy a pad with a group that does not exist', function () {
      const padId = makeid();
      const padWithNonExistentGroup = `notExistentGroup$${padId}`;
      it('throws an error', function (done) {
        this.timeout(150);
        agent.get(`${endPoint('copyPadWithoutHistory')}&sourceID=${sourcePadId}&` +
                  `destinationID=${padWithNonExistentGroup}&force=true`)
            .expect((res) => {
              // code 1, it means an error has happened
              if (res.body.code !== 1) throw new Error('It should report an error');
            })
            .expect(200, done);
      });
    });

    context('when try copy a pad and destination pad already exist', function () {
      const padIdExistent = makeid();

      before(function (done) {
        createNewPadWithHtml(padIdExistent, ulHtml, done);
      });

      context('and force is false', function () {
        it('throws an error', function (done) {
          this.timeout(150);
          agent.get(`${endPoint('copyPadWithoutHistory')}&sourceID=${sourcePadId}` +
                    `&destinationID=${padIdExistent}&force=false`)
              .expect((res) => {
                // code 1, it means an error has happened
                if (res.body.code !== 1) throw new Error('It should report an error');
              })
              .expect(200, done);
        });
      });

      context('and force is true', function () {
        it('returns a successful response', function (done) {
          this.timeout(200);
          agent.get(`${endPoint('copyPadWithoutHistory')}&sourceID=${sourcePadId}` +
                    `&destinationID=${padIdExistent}&force=true`)
              .expect((res) => {
                // code 1, it means an error has happened
                if (res.body.code !== 0) {
                  throw new Error('Copy pad without history with force true failed');
                }
              })
              .expect(200, done);
        });
      });
    });
  });
});

/*
                          -> movePadForce Test

*/

const createNewPadWithHtml = (padId, html, cb) => {
  agent.get(`${endPoint('createPad')}&padID=${padId}`)
      .end(() => {
        agent.post(endPoint('setHTML'))
            .send({
              padID: padId,
              html,
            })
            .end(cb);
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
