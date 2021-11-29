'use strict';
/**
 * The pad object, defined with joose
 */


const Changeset = require('../../static/js/Changeset');
const ChatMessage = require('../../static/js/ChatMessage');
const AttributePool = require('../../static/js/AttributePool');
const assert = require('assert').strict;
const db = require('./DB');
const settings = require('../utils/Settings');
const authorManager = require('./AuthorManager');
const padManager = require('./PadManager');
const padMessageHandler = require('../handler/PadMessageHandler');
const groupManager = require('./GroupManager');
const CustomError = require('../utils/customError');
const readOnlyManager = require('./ReadOnlyManager');
const randomString = require('../utils/randomstring');
const hooks = require('../../static/js/pluginfw/hooks');
const promises = require('../utils/promises');

// serialization/deserialization attributes
const attributeBlackList = ['_db', 'id'];
const jsonableList = ['pool'];

/**
 * Copied from the Etherpad source code. It converts Windows line breaks to Unix
 * line breaks and convert Tabs to spaces
 * @param txt
 */
exports.cleanText = (txt) => txt.replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '        ')
    .replace(/\xa0/g, ' ');

/**
 * @param [database] - Database object to access this pad's records (and only this pad's records --
 *     the shared global Etherpad database object is still used for all other pad accesses, such as
 *     copying the pad). Defaults to the shared global Etherpad database object. This parameter can
 *     be used to shard pad storage across multiple database backends, to put each pad in its own
 *     database table, or to validate imported pad data before it is written to the database.
 */
const Pad = function (id, database = db) {
  this._db = database;
  this.atext = Changeset.makeAText('\n');
  this.pool = new AttributePool();
  this.head = -1;
  this.chatHead = -1;
  this.publicStatus = false;
  this.id = id;
  this.savedRevisions = [];
};

exports.Pad = Pad;

Pad.prototype.apool = function () {
  return this.pool;
};

Pad.prototype.getHeadRevisionNumber = function () {
  return this.head;
};

Pad.prototype.getSavedRevisionsNumber = function () {
  return this.savedRevisions.length;
};

Pad.prototype.getSavedRevisionsList = function () {
  const savedRev = this.savedRevisions.map((rev) => rev.revNum);
  savedRev.sort((a, b) => a - b);
  return savedRev;
};

Pad.prototype.getPublicStatus = function () {
  return this.publicStatus;
};

Pad.prototype.appendRevision = async function (aChangeset, author) {
  if (!author) {
    author = '';
  }

  const newAText = Changeset.applyToAText(aChangeset, this.atext, this.pool);
  Changeset.copyAText(newAText, this.atext);

  const newRev = ++this.head;

  const newRevData = {};
  newRevData.changeset = aChangeset;
  newRevData.meta = {};
  newRevData.meta.author = author;
  newRevData.meta.timestamp = Date.now();

  // ex. getNumForAuthor
  if (author !== '') {
    this.pool.putAttrib(['author', author]);
  }

  if (newRev % 100 === 0) {
    newRevData.meta.pool = this.pool;
    newRevData.meta.atext = this.atext;
  }

  const p = [
    this._db.set(`pad:${this.id}:revs:${newRev}`, newRevData),
    this.saveToDatabase(),
  ];

  // set the author to pad
  if (author) {
    p.push(authorManager.addPad(author, this.id));
  }

  if (this.head === 0) {
    hooks.callAll('padCreate', {pad: this, author});
  } else {
    hooks.callAll('padUpdate', {pad: this, author, revs: newRev, changeset: aChangeset});
  }

  await Promise.all(p);
};

// save all attributes to the database
Pad.prototype.saveToDatabase = async function () {
  const dbObject = {};

  for (const attr in this) {
    if (typeof this[attr] === 'function') continue;
    if (attributeBlackList.indexOf(attr) !== -1) continue;

    dbObject[attr] = this[attr];

    if (jsonableList.indexOf(attr) !== -1) {
      dbObject[attr] = dbObject[attr].toJsonable();
    }
  }

  await this._db.set(`pad:${this.id}`, dbObject);
};

// get time of last edit (changeset application)
Pad.prototype.getLastEdit = async function () {
  const revNum = this.getHeadRevisionNumber();
  return await this._db.getSub(`pad:${this.id}:revs:${revNum}`, ['meta', 'timestamp']);
};

Pad.prototype.getRevisionChangeset = async function (revNum) {
  return await this._db.getSub(`pad:${this.id}:revs:${revNum}`, ['changeset']);
};

Pad.prototype.getRevisionAuthor = async function (revNum) {
  return await this._db.getSub(`pad:${this.id}:revs:${revNum}`, ['meta', 'author']);
};

Pad.prototype.getRevisionDate = async function (revNum) {
  return await this._db.getSub(`pad:${this.id}:revs:${revNum}`, ['meta', 'timestamp']);
};

Pad.prototype.getAllAuthors = function () {
  const authors = [];

  for (const key in this.pool.numToAttrib) {
    if (this.pool.numToAttrib[key][0] === 'author' && this.pool.numToAttrib[key][1] !== '') {
      authors.push(this.pool.numToAttrib[key][1]);
    }
  }

  return authors;
};

Pad.prototype.getInternalRevisionAText = async function (targetRev) {
  const keyRev = this.getKeyRevisionNumber(targetRev);

  // find out which changesets are needed
  const neededChangesets = [];
  for (let curRev = keyRev; curRev < targetRev;) {
    neededChangesets.push(++curRev);
  }

  // get all needed data out of the database

  // start to get the atext of the key revision
  const p_atext = this._db.getSub(`pad:${this.id}:revs:${keyRev}`, ['meta', 'atext']);

  // get all needed changesets
  const changesets = [];
  await Promise.all(
      neededChangesets.map((item) => this.getRevisionChangeset(item).then((changeset) => {
        changesets[item] = changeset;
      })));

  // we should have the atext by now
  let atext = await p_atext;
  atext = Changeset.cloneAText(atext);

  // apply all changesets to the key changeset
  const apool = this.apool();
  for (let curRev = keyRev; curRev < targetRev;) {
    const cs = changesets[++curRev];
    atext = Changeset.applyToAText(cs, atext, apool);
  }

  return atext;
};

Pad.prototype.getRevision = async function (revNum) {
  return await this._db.get(`pad:${this.id}:revs:${revNum}`);
};

Pad.prototype.getAllAuthorColors = async function () {
  const authors = this.getAllAuthors();
  const returnTable = {};
  const colorPalette = authorManager.getColorPalette();

  await Promise.all(
      authors.map((author) => authorManager.getAuthorColorId(author).then((colorId) => {
        // colorId might be a hex color or an number out of the palette
        returnTable[author] = colorPalette[colorId] || colorId;
      })));

  return returnTable;
};

Pad.prototype.getValidRevisionRange = function (startRev, endRev) {
  startRev = parseInt(startRev, 10);
  const head = this.getHeadRevisionNumber();
  endRev = endRev ? parseInt(endRev, 10) : head;

  if (isNaN(startRev) || startRev < 0 || startRev > head) {
    startRev = null;
  }

  if (isNaN(endRev) || endRev < startRev) {
    endRev = null;
  } else if (endRev > head) {
    endRev = head;
  }

  if (startRev != null && endRev != null) {
    return {startRev, endRev};
  }
  return null;
};

Pad.prototype.getKeyRevisionNumber = function (revNum) {
  return Math.floor(revNum / 100) * 100;
};

Pad.prototype.text = function () {
  return this.atext.text;
};

Pad.prototype.setText = async function (newText) {
  // clean the new text
  newText = exports.cleanText(newText);

  const oldText = this.text();

  // create the changeset
  // We want to ensure the pad still ends with a \n, but otherwise keep
  // getText() and setText() consistent.
  let changeset;
  if (newText[newText.length - 1] === '\n') {
    changeset = Changeset.makeSplice(oldText, 0, oldText.length, newText);
  } else {
    changeset = Changeset.makeSplice(oldText, 0, oldText.length - 1, newText);
  }

  // append the changeset
  if (newText !== oldText) await this.appendRevision(changeset);
};

Pad.prototype.appendText = async function (newText) {
  // clean the new text
  newText = exports.cleanText(newText);

  const oldText = this.text();

  // create the changeset
  const changeset = Changeset.makeSplice(oldText, oldText.length, 0, newText);

  // append the changeset
  await this.appendRevision(changeset);
};

/**
 * Adds a chat message to the pad, including saving it to the database.
 *
 * @param {(ChatMessage|string)} msgOrText - Either a chat message object (recommended) or a string
 *     containing the raw text of the user's chat message (deprecated).
 * @param {?string} [authorId] - The user's author ID. Deprecated; use `msgOrText.authorId` instead.
 * @param {?number} [time] - Message timestamp (milliseconds since epoch). Deprecated; use
 *     `msgOrText.time` instead.
 */
Pad.prototype.appendChatMessage = async function (msgOrText, authorId = null, time = null) {
  const msg =
      msgOrText instanceof ChatMessage ? msgOrText : new ChatMessage(msgOrText, authorId, time);
  this.chatHead++;
  await Promise.all([
    // Don't save the display name in the database because the user can change it at any time. The
    // `displayName` property will be populated with the current value when the message is read from
    // the database.
    this._db.set(`pad:${this.id}:chat:${this.chatHead}`, {...msg, displayName: undefined}),
    this.saveToDatabase(),
  ]);
};

/**
 * @param {number} entryNum - ID of the desired chat message.
 * @returns {?ChatMessage}
 */
Pad.prototype.getChatMessage = async function (entryNum) {
  const entry = await this._db.get(`pad:${this.id}:chat:${entryNum}`);
  if (entry == null) return null;
  const message = ChatMessage.fromObject(entry);
  message.displayName = await authorManager.getAuthorName(message.authorId);
  return message;
};

/**
 * @param {number} start - ID of the first desired chat message.
 * @param {number} end - ID of the last desired chat message.
 * @returns {ChatMessage[]} Any existing messages with IDs between `start` (inclusive) and `end`
 *     (inclusive), in order. Note: `start` and `end` form a closed interval, not a half-open
 *     interval as is typical in code.
 */
Pad.prototype.getChatMessages = async function (start, end) {
  const entries = await Promise.all(
      [...Array(end + 1 - start).keys()].map((i) => this.getChatMessage(start + i)));

  // sort out broken chat entries
  // it looks like in happened in the past that the chat head was
  // incremented, but the chat message wasn't added
  return entries.filter((entry) => {
    const pass = (entry != null);
    if (!pass) {
      console.warn(`WARNING: Found broken chat entry in pad ${this.id}`);
    }
    return pass;
  });
};

Pad.prototype.init = async function (text) {
  // replace text with default text if text isn't set
  if (text == null) {
    text = settings.defaultPadText;
  }

  // try to load the pad
  const value = await this._db.get(`pad:${this.id}`);

  // if this pad exists, load it
  if (value != null) {
    // copy all attr. To a transfrom via fromJsonable if necassary
    for (const attr in value) {
      if (jsonableList.indexOf(attr) !== -1) {
        this[attr] = this[attr].fromJsonable(value[attr]);
      } else {
        this[attr] = value[attr];
      }
    }
  } else {
    // this pad doesn't exist, so create it
    const firstChangeset = Changeset.makeSplice('\n', 0, 0, exports.cleanText(text));

    await this.appendRevision(firstChangeset, '');
  }
};

Pad.prototype.copy = async function (destinationID, force) {
  // Kick everyone from this pad.
  // This was commented due to https://github.com/ether/etherpad-lite/issues/3183.
  // Do we really need to kick everyone out?
  // padMessageHandler.kickSessionsFromPad(sourceID);

  // flush the source pad:
  await this.saveToDatabase();

  // if it's a group pad, let's make sure the group exists.
  const destGroupID = await this.checkIfGroupExistAndReturnIt(destinationID);

  // if force is true and already exists a Pad with the same id, remove that Pad
  await this.removePadIfForceIsTrueAndAlreadyExist(destinationID, force);

  // copy the 'pad' entry
  const pad = await this._db.get(`pad:${this.id}`);
  db.set(`pad:${destinationID}`, pad);

  // copy all relations in parallel
  const promises = [];

  // copy all chat messages
  const chatHead = this.chatHead;
  for (let i = 0; i <= chatHead; ++i) {
    const p = this._db.get(`pad:${this.id}:chat:${i}`)
        .then((chat) => db.set(`pad:${destinationID}:chat:${i}`, chat));
    promises.push(p);
  }

  // copy all revisions
  const revHead = this.head;
  for (let i = 0; i <= revHead; ++i) {
    const p = this._db.get(`pad:${this.id}:revs:${i}`)
        .then((rev) => db.set(`pad:${destinationID}:revs:${i}`, rev));
    promises.push(p);
  }

  this.copyAuthorInfoToDestinationPad(destinationID);

  // wait for the above to complete
  await Promise.all(promises);

  // Group pad? Add it to the group's list
  if (destGroupID) {
    await db.setSub(`group:${destGroupID}`, ['pads', destinationID], 1);
  }

  // delay still necessary?
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Initialize the new pad (will update the listAllPads cache)
  await padManager.getPad(destinationID, null); // this runs too early.

  // let the plugins know the pad was copied
  await hooks.aCallAll('padCopy', {originalPad: this, destinationID});

  return {padID: destinationID};
};

Pad.prototype.checkIfGroupExistAndReturnIt = async function (destinationID) {
  let destGroupID = false;

  if (destinationID.indexOf('$') >= 0) {
    destGroupID = destinationID.split('$')[0];
    const groupExists = await groupManager.doesGroupExist(destGroupID);

    // group does not exist
    if (!groupExists) {
      throw new CustomError('groupID does not exist for destinationID', 'apierror');
    }
  }
  return destGroupID;
};

Pad.prototype.removePadIfForceIsTrueAndAlreadyExist = async function (destinationID, force) {
  // if the pad exists, we should abort, unless forced.
  const exists = await padManager.doesPadExist(destinationID);

  // allow force to be a string
  if (typeof force === 'string') {
    force = (force.toLowerCase() === 'true');
  } else {
    force = !!force;
  }

  if (exists) {
    if (!force) {
      console.error('erroring out without force');
      throw new CustomError('destinationID already exists', 'apierror');
    }

    // exists and forcing
    const pad = await padManager.getPad(destinationID);
    await pad.remove();
  }
};

Pad.prototype.copyAuthorInfoToDestinationPad = function (destinationID) {
  // add the new sourcePad to all authors who contributed to the old one
  this.getAllAuthors().forEach((authorID) => {
    authorManager.addPad(authorID, destinationID);
  });
};

Pad.prototype.copyPadWithoutHistory = async function (destinationID, force) {
  const sourceID = this.id;

  // flush the source pad
  this.saveToDatabase();

  // if it's a group pad, let's make sure the group exists.
  const destGroupID = await this.checkIfGroupExistAndReturnIt(destinationID);

  // if force is true and already exists a Pad with the same id, remove that Pad
  await this.removePadIfForceIsTrueAndAlreadyExist(destinationID, force);

  const sourcePad = await padManager.getPad(sourceID);

  // add the new sourcePad to all authors who contributed to the old one
  this.copyAuthorInfoToDestinationPad(destinationID);

  // Group pad? Add it to the group's list
  if (destGroupID) {
    await db.setSub(`group:${destGroupID}`, ['pads', destinationID], 1);
  }

  // initialize the pad with a new line to avoid getting the defaultText
  const newPad = await padManager.getPad(destinationID, '\n');

  const oldAText = this.atext;
  const newPool = newPad.pool;
  newPool.fromJsonable(sourcePad.pool.toJsonable()); // copy that sourceId pool to the new pad

  // based on Changeset.makeSplice
  const assem = Changeset.smartOpAssembler();
  Changeset.appendATextToAssembler(oldAText, assem);
  assem.endDocument();

  // although we have instantiated the newPad with '\n', an additional '\n' is
  // added internally, so the pad text on the revision 0 is "\n\n"
  const oldLength = 2;

  const newLength = assem.getLengthChange();
  const newText = oldAText.text;

  // create a changeset that removes the previous text and add the newText with
  // all atributes present on the source pad
  const changeset = Changeset.pack(oldLength, newLength, assem.toString(), newText);
  newPad.appendRevision(changeset);

  await hooks.aCallAll('padCopy', {originalPad: this, destinationID});

  return {padID: destinationID};
};


Pad.prototype.remove = async function () {
  const padID = this.id;
  const p = [];

  // kick everyone from this pad
  padMessageHandler.kickSessionsFromPad(padID);

  // delete all relations - the original code used async.parallel but
  // none of the operations except getting the group depended on callbacks
  // so the database operations here are just started and then left to
  // run to completion

  // is it a group pad? -> delete the entry of this pad in the group
  if (padID.indexOf('$') >= 0) {
    // it is a group pad
    const groupID = padID.substring(0, padID.indexOf('$'));
    const group = await db.get(`group:${groupID}`);

    // remove the pad entry
    delete group.pads[padID];

    // set the new value
    p.push(db.set(`group:${groupID}`, group));
  }

  // remove the readonly entries
  p.push(readOnlyManager.getReadOnlyId(padID).then(async (readonlyID) => {
    await db.remove(`readonly2pad:${readonlyID}`);
  }));
  p.push(db.remove(`pad2readonly:${padID}`));

  // delete all chat messages
  p.push(promises.timesLimit(this.chatHead + 1, 500, async (i) => {
    await this._db.remove(`pad:${this.id}:chat:${i}`, null);
  }));

  // delete all revisions
  p.push(promises.timesLimit(this.head + 1, 500, async (i) => {
    await this._db.remove(`pad:${this.id}:revs:${i}`, null);
  }));

  // remove pad from all authors who contributed
  this.getAllAuthors().forEach((authorID) => {
    p.push(authorManager.removePad(authorID, padID));
  });

  // delete the pad entry and delete pad from padManager
  p.push(padManager.removePad(padID));
  p.push(hooks.aCallAll('padRemove', {padID}));
  await Promise.all(p);
};

// set in db
Pad.prototype.setPublicStatus = async function (publicStatus) {
  this.publicStatus = publicStatus;
  await this.saveToDatabase();
};

Pad.prototype.addSavedRevision = async function (revNum, savedById, label) {
  // if this revision is already saved, return silently
  for (const i in this.savedRevisions) {
    if (this.savedRevisions[i] && this.savedRevisions[i].revNum === revNum) {
      return;
    }
  }

  // build the saved revision object
  const savedRevision = {};
  savedRevision.revNum = revNum;
  savedRevision.savedById = savedById;
  savedRevision.label = label || `Revision ${revNum}`;
  savedRevision.timestamp = Date.now();
  savedRevision.id = randomString(10);

  // save this new saved revision
  this.savedRevisions.push(savedRevision);
  await this.saveToDatabase();
};

Pad.prototype.getSavedRevisions = function () {
  return this.savedRevisions;
};

/**
 * Asserts that all pad data is consistent. Throws if inconsistent.
 */
Pad.prototype.check = async function () {
  assert(this.id != null);
  assert.equal(typeof this.id, 'string');

  const head = this.getHeadRevisionNumber();
  assert(Number.isInteger(head));
  assert(head >= -1);

  const savedRevisionsList = this.getSavedRevisionsList();
  assert(Array.isArray(savedRevisionsList));
  assert.equal(this.getSavedRevisionsNumber(), savedRevisionsList.length);
  let prevSavedRev = null;
  for (const rev of savedRevisionsList) {
    assert(Number.isInteger(rev));
    assert(rev >= 0);
    assert(rev <= head);
    assert(prevSavedRev == null || rev > prevSavedRev);
    prevSavedRev = rev;
  }
  const savedRevisions = this.getSavedRevisions();
  assert(Array.isArray(savedRevisions));
  assert.equal(savedRevisions.length, savedRevisionsList.length);
  const savedRevisionsIds = new Set();
  for (const savedRev of savedRevisions) {
    assert(savedRev != null);
    assert.equal(typeof savedRev, 'object');
    assert(savedRevisionsList.includes(savedRev.revNum));
    assert(savedRev.id != null);
    assert.equal(typeof savedRev.id, 'string');
    assert(!savedRevisionsIds.has(savedRev.id));
    savedRevisionsIds.add(savedRev.id);
  }

  const pool = this.apool();
  assert(pool instanceof AttributePool);
  await pool.check();

  const decodeAttribString = function* (str) {
    const re = /\*([0-9a-z]+)|./gy;
    let match;
    while ((match = re.exec(str)) != null) {
      const [m, n] = match;
      if (n == null) throw new Error(`invalid character in attribute string: ${m}`);
      yield Number.parseInt(n, 36);
    }
  };

  const authors = new Set();
  pool.eachAttrib((k, v) => {
    if (k === 'author' && v) authors.add(v);
  });
  let atext = Changeset.makeAText('\n');
  let r;
  try {
    for (r = 0; r <= head; ++r) {
      const [changeset, author, timestamp] = await Promise.all([
        this.getRevisionChangeset(r),
        this.getRevisionAuthor(r),
        this.getRevisionDate(r),
      ]);
      assert(author != null);
      assert.equal(typeof author, 'string');
      if (author) authors.add(author);
      assert(timestamp != null);
      assert.equal(typeof timestamp, 'number');
      assert(timestamp > 0);
      assert(changeset != null);
      assert.equal(typeof changeset, 'string');
      Changeset.checkRep(changeset);
      const unpacked = Changeset.unpack(changeset);
      let text = atext.text;
      const iter = Changeset.opIterator(unpacked.ops);
      while (iter.hasNext()) {
        const op = iter.next();
        if (['=', '-'].includes(op.opcode)) {
          assert(text.length >= op.chars);
          const consumed = text.slice(0, op.chars);
          const nlines = (consumed.match(/\n/g) || []).length;
          assert.equal(op.lines, nlines);
          if (op.lines > 0) assert(consumed.endsWith('\n'));
          text = text.slice(op.chars);
        }
        let prevK = null;
        for (const n of decodeAttribString(op.attribs)) {
          const attrib = pool.getAttrib(n);
          assert(attrib != null);
          const [k] = attrib;
          assert(prevK == null || prevK < k);
          prevK = k;
        }
      }
      atext = Changeset.applyToAText(changeset, atext, pool);
      assert.deepEqual(await this.getInternalRevisionAText(r), atext);
    }
  } catch (err) {
    const pfx = `(pad ${this.id} revision ${r}) `;
    if (err.stack) err.stack = pfx + err.stack;
    err.message = pfx + err.message;
    throw err;
  }
  assert.equal(this.text(), atext.text);
  assert.deepEqual(this.atext, atext);
  assert.deepEqual(this.getAllAuthors().sort(), [...authors].sort());

  assert(Number.isInteger(this.chatHead));
  assert(this.chatHead >= -1);
  let c;
  try {
    for (c = 0; c <= this.chatHead; ++c) {
      const msg = await this.getChatMessage(c);
      assert(msg != null);
      assert(msg instanceof ChatMessage);
    }
  } catch (err) {
    const pfx = `(pad ${this.id} chat message ${c}) `;
    if (err.stack) err.stack = pfx + err.stack;
    err.message = pfx + err.message;
    throw err;
  }
};
