/**
 * The pad object, defined with joose
 */


var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var AttributePool = require("ep_etherpad-lite/static/js/AttributePool");
var db = require("./DB");
var settings = require('../utils/Settings');
var authorManager = require("./AuthorManager");
var padManager = require("./PadManager");
var padMessageHandler = require("../handler/PadMessageHandler");
var groupManager = require("./GroupManager");
var customError = require("../utils/customError");
var readOnlyManager = require("./ReadOnlyManager");
var crypto = require("crypto");
var randomString = require("../utils/randomstring");
var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');
var promises = require('../utils/promises')

// serialization/deserialization attributes
var attributeBlackList = ["id"];
var jsonableList = ["pool"];

/**
 * Copied from the Etherpad source code. It converts Windows line breaks to Unix line breaks and convert Tabs to spaces
 * @param txt
 */
exports.cleanText = function (txt) {
  return txt.replace(/\r\n/g,'\n').replace(/\r/g,'\n').replace(/\t/g, '        ').replace(/\xa0/g, ' ');
};


let Pad = function Pad(id) {
  this.atext = Changeset.makeAText("\n");
  this.pool = new AttributePool();
  this.head = -1;
  this.chatHead = -1;
  this.publicStatus = false;
  this.passwordHash = null;
  this.id = id;
  this.savedRevisions = [];
};

exports.Pad = Pad;

Pad.prototype.apool = function apool() {
  return this.pool;
};

Pad.prototype.getHeadRevisionNumber = function getHeadRevisionNumber() {
  return this.head;
};

Pad.prototype.getSavedRevisionsNumber = function getSavedRevisionsNumber() {
  return this.savedRevisions.length;
};

Pad.prototype.getSavedRevisionsList = function getSavedRevisionsList() {
  var savedRev = new Array();
  for (var rev in this.savedRevisions) {
    savedRev.push(this.savedRevisions[rev].revNum);
  }
  savedRev.sort(function(a, b) {
    return a - b;
  });
  return savedRev;
};

Pad.prototype.getPublicStatus = function getPublicStatus() {
  return this.publicStatus;
};

Pad.prototype.appendRevision = function appendRevision(aChangeset, author) {
  if (!author) {
    author = '';
  }

  var newAText = Changeset.applyToAText(aChangeset, this.atext, this.pool);
  Changeset.copyAText(newAText, this.atext);

  var newRev = ++this.head;

  var newRevData = {};
  newRevData.changeset = aChangeset;
  newRevData.meta = {};
  newRevData.meta.author = author;
  newRevData.meta.timestamp = Date.now();

  // ex. getNumForAuthor
  if (author != '') {
    this.pool.putAttrib(['author', author || '']);
  }

  if (newRev % 100 == 0) {
    newRevData.meta.atext = this.atext;
  }

  db.set("pad:" + this.id + ":revs:" + newRev, newRevData);
  this.saveToDatabase();

  // set the author to pad
  if (author) {
    authorManager.addPad(author, this.id);
  }

  if (this.head == 0) {
    hooks.callAll("padCreate", {'pad':this, 'author': author});
  } else {
    hooks.callAll("padUpdate", {'pad':this, 'author': author});
  }
};

// save all attributes to the database
Pad.prototype.saveToDatabase = function saveToDatabase() {
  var dbObject = {};

  for (var attr in this) {
    if (typeof this[attr] === "function") continue;
    if (attributeBlackList.indexOf(attr) !== -1) continue;

    dbObject[attr] = this[attr];

    if (jsonableList.indexOf(attr) !== -1) {
      dbObject[attr] = dbObject[attr].toJsonable();
    }
  }

  db.set("pad:" + this.id, dbObject);
}

// get time of last edit (changeset application)
Pad.prototype.getLastEdit = function getLastEdit() {
  var revNum = this.getHeadRevisionNumber();
  return db.getSub("pad:" + this.id + ":revs:" + revNum, ["meta", "timestamp"]);
}

Pad.prototype.getRevisionChangeset = function getRevisionChangeset(revNum) {
  return db.getSub("pad:" + this.id + ":revs:" + revNum, ["changeset"]);
}

Pad.prototype.getRevisionAuthor = function getRevisionAuthor(revNum) {
  return db.getSub("pad:" + this.id + ":revs:" + revNum, ["meta", "author"]);
}

Pad.prototype.getRevisionDate = function getRevisionDate(revNum) {
  return db.getSub("pad:" + this.id + ":revs:" + revNum, ["meta", "timestamp"]);
}

Pad.prototype.getAllAuthors = function getAllAuthors() {
  var authors = [];

  for(var key in this.pool.numToAttrib) {
    if (this.pool.numToAttrib[key][0] == "author" && this.pool.numToAttrib[key][1] != "") {
      authors.push(this.pool.numToAttrib[key][1]);
    }
  }

  return authors;
};

Pad.prototype.getInternalRevisionAText = async function getInternalRevisionAText(targetRev) {
  let keyRev = this.getKeyRevisionNumber(targetRev);

  // find out which changesets are needed
  let neededChangesets = [];
  for (let curRev = keyRev; curRev < targetRev; ) {
    neededChangesets.push(++curRev);
  }

  // get all needed data out of the database

  // start to get the atext of the key revision
  let p_atext = db.getSub("pad:" + this.id + ":revs:" + keyRev, ["meta", "atext"]);

  // get all needed changesets
  let changesets = [];
  await Promise.all(neededChangesets.map(item => {
    return this.getRevisionChangeset(item).then(changeset => {
      changesets[item] = changeset;
    });
  }));

  // we should have the atext by now
  let atext = await p_atext;
  atext = Changeset.cloneAText(atext);

  // apply all changesets to the key changeset
  let apool = this.apool();
  for (let curRev = keyRev; curRev < targetRev; ) {
    let cs = changesets[++curRev];
    atext = Changeset.applyToAText(cs, atext, apool);
  }

  return atext;
}

Pad.prototype.getRevision = function getRevisionChangeset(revNum) {
  return db.get("pad:" + this.id + ":revs:" + revNum);
}

Pad.prototype.getAllAuthorColors = async function getAllAuthorColors() {
  let authors = this.getAllAuthors();
  let returnTable = {};
  let colorPalette = authorManager.getColorPalette();

  await Promise.all(authors.map(author => {
    return authorManager.getAuthorColorId(author).then(colorId => {
      // colorId might be a hex color or an number out of the palette
      returnTable[author] = colorPalette[colorId] || colorId;
    });
  }));

  return returnTable;
}

Pad.prototype.getValidRevisionRange = function getValidRevisionRange(startRev, endRev) {
  startRev = parseInt(startRev, 10);
  var head = this.getHeadRevisionNumber();
  endRev = endRev ? parseInt(endRev, 10) : head;

  if (isNaN(startRev) || startRev < 0 || startRev > head) {
    startRev = null;
  }

  if (isNaN(endRev) || endRev < startRev) {
    endRev = null;
  } else if (endRev > head) {
    endRev = head;
  }

  if (startRev !== null && endRev !== null) {
    return { startRev: startRev , endRev: endRev }
  }
  return null;
};

Pad.prototype.getKeyRevisionNumber = function getKeyRevisionNumber(revNum) {
  return Math.floor(revNum / 100) * 100;
};

Pad.prototype.text = function text() {
  return this.atext.text;
};

Pad.prototype.setText = function setText(newText) {
  // clean the new text
  newText = exports.cleanText(newText);

  var oldText = this.text();

  // create the changeset
  // We want to ensure the pad still ends with a \n, but otherwise keep
  // getText() and setText() consistent.
  var changeset;
  if (newText[newText.length - 1] == '\n') {
    changeset = Changeset.makeSplice(oldText, 0, oldText.length, newText);
  } else {
    changeset = Changeset.makeSplice(oldText, 0, oldText.length-1, newText);
  }

  // append the changeset
  this.appendRevision(changeset);
};

Pad.prototype.appendText = function appendText(newText) {
  // clean the new text
  newText = exports.cleanText(newText);

  var oldText = this.text();

  // create the changeset
  var changeset = Changeset.makeSplice(oldText, oldText.length, 0, newText);

  // append the changeset
  this.appendRevision(changeset);
};

Pad.prototype.appendChatMessage = function appendChatMessage(text, userId, time) {
  this.chatHead++;
  // save the chat entry in the database
  db.set("pad:" + this.id + ":chat:" + this.chatHead, { "text": text, "userId": userId, "time": time });
  this.saveToDatabase();
};

Pad.prototype.getChatMessage = async function getChatMessage(entryNum) {
  // get the chat entry
  let entry = await db.get("pad:" + this.id + ":chat:" + entryNum);

  // get the authorName if the entry exists
  if (entry != null) {
    entry.userName = await authorManager.getAuthorName(entry.userId);
  }

  return entry;
};

Pad.prototype.getChatMessages = async function getChatMessages(start, end) {

  // collect the numbers of chat entries and in which order we need them
  let neededEntries = [];
  for (let order = 0, entryNum = start; entryNum <= end; ++order, ++entryNum) {
    neededEntries.push({ entryNum, order });
  }

  // get all entries out of the database
  let entries = [];
  await Promise.all(neededEntries.map(entryObject => {
    return this.getChatMessage(entryObject.entryNum).then(entry => {
      entries[entryObject.order] = entry;
    });
  }));

  // sort out broken chat entries
  // it looks like in happened in the past that the chat head was
  // incremented, but the chat message wasn't added
  let cleanedEntries = entries.filter(entry => {
    let pass = (entry != null);
    if (!pass) {
      console.warn("WARNING: Found broken chat entry in pad " + this.id);
    }
    return pass;
  });

  return cleanedEntries;
}

Pad.prototype.init = async function init(text) {

  // replace text with default text if text isn't set
  if (text == null) {
    text = settings.defaultPadText;
  }

  // try to load the pad
  let value = await db.get("pad:" + this.id);

  // if this pad exists, load it
  if (value != null) {
    // copy all attr. To a transfrom via fromJsonable if necassary
    for (var attr in value) {
      if (jsonableList.indexOf(attr) !== -1) {
        this[attr] = this[attr].fromJsonable(value[attr]);
      } else {
        this[attr] = value[attr];
      }
    }
  } else {
    // this pad doesn't exist, so create it
    let firstChangeset = Changeset.makeSplice("\n", 0, 0, exports.cleanText(text));

    this.appendRevision(firstChangeset, '');
  }

  hooks.callAll("padLoad", { 'pad':  this });
}

Pad.prototype.copy = async function copy(destinationID, force) {

  let sourceID = this.id;

  // allow force to be a string
  if (typeof force === "string") {
    force = (force.toLowerCase() === "true");
  } else {
    force = !!force;
  }

  // Kick everyone from this pad.
  // This was commented due to https://github.com/ether/etherpad-lite/issues/3183.
  // Do we really need to kick everyone out?
  // padMessageHandler.kickSessionsFromPad(sourceID);

  // flush the source pad:
  this.saveToDatabase();

  // if it's a group pad, let's make sure the group exists.
  let destGroupID;
  if (destinationID.indexOf("$") >= 0) {

    destGroupID = destinationID.split("$")[0]
    let groupExists = await groupManager.doesGroupExist(destGroupID);

    // group does not exist
    if (!groupExists) {
      throw new customError("groupID does not exist for destinationID", "apierror");
    }
  }

  // if the pad exists, we should abort, unless forced.
  let exists = await padManager.doesPadExist(destinationID);

  if (exists) {
    if (!force) {
      console.error("erroring out without force");
      throw new customError("destinationID already exists", "apierror");
    }

    // exists and forcing
    let pad = await padManager.getPad(destinationID);
    await pad.remove();
  }

  // copy the 'pad' entry
  let pad = await db.get("pad:" + sourceID);
  db.set("pad:" + destinationID, pad);

  // copy all relations in parallel
  let promises = [];

  // copy all chat messages
  let chatHead = this.chatHead;
  for (let i = 0; i <= chatHead; ++i) {
    let p = db.get("pad:" + sourceID + ":chat:" + i).then(chat => {
      return db.set("pad:" + destinationID + ":chat:" + i, chat);
    });
    promises.push(p);
  }

  // copy all revisions
  let revHead = this.head;
  for (let i = 0; i <= revHead; ++i) {
    let p = db.get("pad:" + sourceID + ":revs:" + i).then(rev => {
      return db.set("pad:" + destinationID + ":revs:" + i, rev);
    });
    promises.push(p);
  }

  // add the new pad to all authors who contributed to the old one
  this.getAllAuthors().forEach(authorID => {
    authorManager.addPad(authorID, destinationID);
  });

  // wait for the above to complete
  await Promise.all(promises);

  // Group pad? Add it to the group's list
  if (destGroupID) {
    await db.setSub("group:" + destGroupID, ["pads", destinationID], 1);
  }

  // delay still necessary?
  await new Promise(resolve => setTimeout(resolve, 10));

  // Initialize the new pad (will update the listAllPads cache)
  await padManager.getPad(destinationID, null); // this runs too early.

  // let the plugins know the pad was copied
  hooks.callAll('padCopy', { 'originalPad': this, 'destinationID': destinationID });

  return { padID: destinationID };
}

Pad.prototype.remove = async function remove() {
  var padID = this.id;

  // kick everyone from this pad
  padMessageHandler.kickSessionsFromPad(padID);

  // delete all relations - the original code used async.parallel but
  // none of the operations except getting the group depended on callbacks
  // so the database operations here are just started and then left to
  // run to completion

  // is it a group pad? -> delete the entry of this pad in the group
  if (padID.indexOf("$") >= 0) {

    // it is a group pad
    let groupID = padID.substring(0, padID.indexOf("$"));
    let group = await db.get("group:" + groupID);

    // remove the pad entry
    delete group.pads[padID];

    // set the new value
    db.set("group:" + groupID, group);
  }

  // remove the readonly entries
  let readonlyID = readOnlyManager.getReadOnlyId(padID);

  db.remove("pad2readonly:" + padID);
  db.remove("readonly2pad:" + readonlyID);

  // delete all chat messages
  promises.timesLimit(this.chatHead + 1, 500, function (i) {
    return db.remove("pad:" + padID + ":chat:" + i, null);
  })

  // delete all revisions
  promises.timesLimit(this.head + 1, 500, function (i) {
    return db.remove("pad:" + padID + ":revs:" + i, null);
  })

  // remove pad from all authors who contributed
  this.getAllAuthors().forEach(authorID => {
    authorManager.removePad(authorID, padID);
  });

  // delete the pad entry and delete pad from padManager
  padManager.removePad(padID);
  hooks.callAll("padRemove", { padID });
}

// set in db
Pad.prototype.setPublicStatus = function setPublicStatus(publicStatus) {
  this.publicStatus = publicStatus;
  this.saveToDatabase();
};

Pad.prototype.setPassword = function setPassword(password) {
  this.passwordHash = password == null ? null : hash(password, generateSalt());
  this.saveToDatabase();
};

Pad.prototype.isCorrectPassword = function isCorrectPassword(password) {
  return compare(this.passwordHash, password);
};

Pad.prototype.isPasswordProtected = function isPasswordProtected() {
  return this.passwordHash != null;
};

Pad.prototype.addSavedRevision = function addSavedRevision(revNum, savedById, label) {
  // if this revision is already saved, return silently
  for (var i in this.savedRevisions) {
    if (this.savedRevisions[i] && this.savedRevisions[i].revNum === revNum) {
      return;
    }
  }

  // build the saved revision object
  var savedRevision = {};
  savedRevision.revNum = revNum;
  savedRevision.savedById = savedById;
  savedRevision.label = label || "Revision " + revNum;
  savedRevision.timestamp = Date.now();
  savedRevision.id = randomString(10);

  // save this new saved revision
  this.savedRevisions.push(savedRevision);
  this.saveToDatabase();
};

Pad.prototype.getSavedRevisions = function getSavedRevisions() {
  return this.savedRevisions;
};

/* Crypto helper methods */

function hash(password, salt) {
  var shasum = crypto.createHash('sha512');
  shasum.update(password + salt);

  return shasum.digest("hex") + "$" + salt;
}

function generateSalt() {
  return randomString(86);
}

function compare(hashStr, password) {
  return hash(password, hashStr.split("$")[1]) === hashStr;
}
