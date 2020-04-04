/**
 * This module provides all API functions
 */

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var customError = require("../utils/customError");
var padManager = require("./PadManager");
var padMessageHandler = require("../handler/PadMessageHandler");
var readOnlyManager = require("./ReadOnlyManager");
var groupManager = require("./GroupManager");
var authorManager = require("./AuthorManager");
var sessionManager = require("./SessionManager");
var exportHtml = require("../utils/ExportHtml");
var exportTxt = require("../utils/ExportTxt");
var importHtml = require("../utils/ImportHtml");
var cleanText = require("./Pad").cleanText;
var PadDiff = require("../utils/padDiff");

/**********************/
/**GROUP FUNCTIONS*****/
/**********************/

exports.listAllGroups = groupManager.listAllGroups;
exports.createGroup = groupManager.createGroup;
exports.createGroupIfNotExistsFor = groupManager.createGroupIfNotExistsFor;
exports.deleteGroup = groupManager.deleteGroup;
exports.listPads = groupManager.listPads;
exports.createGroupPad = groupManager.createGroupPad;

/**********************/
/**PADLIST FUNCTION****/
/**********************/

exports.listAllPads = padManager.listAllPads;

/**********************/
/**AUTHOR FUNCTIONS****/
/**********************/

exports.createAuthor = authorManager.createAuthor;
exports.createAuthorIfNotExistsFor = authorManager.createAuthorIfNotExistsFor;
exports.getAuthorName = authorManager.getAuthorName;
exports.listPadsOfAuthor = authorManager.listPadsOfAuthor;
exports.padUsers = padMessageHandler.padUsers;
exports.padUsersCount = padMessageHandler.padUsersCount;

/**********************/
/**SESSION FUNCTIONS***/
/**********************/

exports.createSession = sessionManager.createSession;
exports.deleteSession = sessionManager.deleteSession;
exports.getSessionInfo = sessionManager.getSessionInfo;
exports.listSessionsOfGroup = sessionManager.listSessionsOfGroup;
exports.listSessionsOfAuthor = sessionManager.listSessionsOfAuthor;

/************************/
/**PAD CONTENT FUNCTIONS*/
/************************/

/**
getAttributePool(padID) returns the attribute pool of a pad

Example returns:
{
 "code":0,
 "message":"ok",
 "data": {
    "pool":{
        "numToAttrib":{
            "0":["author","a.X4m8bBWJBZJnWGSh"],
            "1":["author","a.TotfBPzov54ihMdH"],
            "2":["author","a.StiblqrzgeNTbK05"],
            "3":["bold","true"]
        },
        "attribToNum":{
            "author,a.X4m8bBWJBZJnWGSh":0,
            "author,a.TotfBPzov54ihMdH":1,
            "author,a.StiblqrzgeNTbK05":2,
            "bold,true":3
        },
        "nextNum":4
    }
 }
}

*/
exports.getAttributePool = async function(padID)
{
  let pad = await getPadSafe(padID, true);
  return { pool: pad.pool };
}

/**
getRevisionChangeset (padID, [rev])

get the changeset at a given revision, or last revision if 'rev' is not defined.

Example returns:
{
    "code" : 0,
    "message" : "ok",
    "data" : "Z:1>6b|5+6b$Welcome to Etherpad!\n\nThis pad text is synchronized as you type, so that everyone viewing this page sees the same text. This allows you to collaborate seamlessly on documents!\n\nGet involved with Etherpad at http://etherpad.org\n"
}

*/
exports.getRevisionChangeset = async function(padID, rev)
{
  // try to parse the revision number
  if (rev !== undefined) {
    rev = checkValidRev(rev);
  }

  // get the pad
  let pad = await getPadSafe(padID, true);
  let head = pad.getHeadRevisionNumber();

  // the client asked for a special revision
  if (rev !== undefined) {

    // check if this is a valid revision
    if (rev > head) {
      throw new customError("rev is higher than the head revision of the pad", "apierror");
    }

    // get the changeset for this revision
    return pad.getRevisionChangeset(rev);
  }

  // the client wants the latest changeset, lets return it to him
  return pad.getRevisionChangeset(head);
}

/**
getText(padID, [rev]) returns the text of a pad

Example returns:

{code: 0, message:"ok", data: {text:"Welcome Text"}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getText = async function(padID, rev)
{
  // try to parse the revision number
  if (rev !== undefined) {
    rev = checkValidRev(rev);
  }

  // get the pad
  let pad = await getPadSafe(padID, true);
  let head = pad.getHeadRevisionNumber();

  // the client asked for a special revision
  if (rev !== undefined) {

    // check if this is a valid revision
    if (rev > head) {
      throw new customError("rev is higher than the head revision of the pad", "apierror");
    }

    // get the text of this revision
    let text = await pad.getInternalRevisionAText(rev);
    return { text };
  }

  // the client wants the latest text, lets return it to him
  let text = exportTxt.getTXTFromAtext(pad, pad.atext);
  return { text };
}

/**
setText(padID, text) sets the text of a pad

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"padID does not exist", data: null}
{code: 1, message:"text too long", data: null}
*/
exports.setText = async function(padID, text)
{
  // text is required
  if (typeof text !== "string") {
    throw new customError("text is not a string", "apierror");
  }

  // get the pad
  let pad = await getPadSafe(padID, true);

  // set the text
  pad.setText(text);

  // update the clients on the pad
  padMessageHandler.updatePadClients(pad);
}

/**
appendText(padID, text) appends text to a pad

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"padID does not exist", data: null}
{code: 1, message:"text too long", data: null}
*/
exports.appendText = async function(padID, text)
{
  // text is required
  if (typeof text !== "string") {
    throw new customError("text is not a string", "apierror");
  }

  // get and update the pad
  let pad = await getPadSafe(padID, true);
  pad.appendText(text);

  // update the clients on the pad
  padMessageHandler.updatePadClients(pad);
}

/**
getHTML(padID, [rev]) returns the html of a pad

Example returns:

{code: 0, message:"ok", data: {text:"Welcome <strong>Text</strong>"}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getHTML = async function(padID, rev)
{
  if (rev !== undefined) {
    rev = checkValidRev(rev);
  }

  let pad = await getPadSafe(padID, true);

  // the client asked for a special revision
  if (rev !== undefined) {
    // check if this is a valid revision
    let head = pad.getHeadRevisionNumber();
    if (rev > head) {
      throw new customError("rev is higher than the head revision of the pad", "apierror");
    }
  }

  // get the html of this revision
  let html = await exportHtml.getPadHTML(pad, rev);

  // wrap the HTML
  html = "<!DOCTYPE HTML><html><body>" + html + "</body></html>";
  return { html };
}

/**
setHTML(padID, html) sets the text of a pad based on HTML

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"padID does not exist", data: null}
*/
exports.setHTML = async function(padID, html)
{
  // html string is required
  if (typeof html !== "string") {
    throw new customError("html is not a string", "apierror");
  }

  // get the pad
  let pad = await getPadSafe(padID, true);

  // add a new changeset with the new html to the pad
  try {
    importHtml.setPadHTML(pad, cleanText(html));
  } catch (e) {
    throw new customError("HTML is malformed", "apierror");
  }

  // update the clients on the pad
  padMessageHandler.updatePadClients(pad);
};

/******************/
/**CHAT FUNCTIONS */
/******************/

/**
getChatHistory(padId, start, end), returns a part of or the whole chat-history of this pad

Example returns:

{"code":0,"message":"ok","data":{"messages":[{"text":"foo","authorID":"a.foo","time":1359199533759,"userName":"test"},
                                             {"text":"bar","authorID":"a.foo","time":1359199534622,"userName":"test"}]}}

{code: 1, message:"start is higher or equal to the current chatHead", data: null}

{code: 1, message:"padID does not exist", data: null}
*/
exports.getChatHistory = async function(padID, start, end)
{
  if (start && end) {
    if (start < 0) {
      throw new customError("start is below zero", "apierror");
    }
    if (end < 0) {
      throw new customError("end is below zero", "apierror");
    }
    if (start > end) {
      throw new customError("start is higher than end", "apierror");
    }
  }

  // get the pad
  let pad = await getPadSafe(padID, true);

  var chatHead = pad.chatHead;

  // fall back to getting the whole chat-history if a parameter is missing
  if (!start || !end) {
    start = 0;
    end = pad.chatHead;
  }

  if (start > chatHead) {
    throw new customError("start is higher than the current chatHead", "apierror");
  }
  if (end > chatHead) {
    throw new customError("end is higher than the current chatHead", "apierror");
  }

  // the the whole message-log and return it to the client
  let messages = await pad.getChatMessages(start, end);

  return { messages };
}

/**
appendChatMessage(padID, text, authorID, time), creates a chat message for the pad id, time is a timestamp

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"padID does not exist", data: null}
*/
exports.appendChatMessage = async function(padID, text, authorID, time)
{
  // text is required
  if (typeof text !== "string") {
    throw new customError("text is not a string", "apierror");
  }

  // if time is not an integer value set time to current timestamp
  if (time === undefined || !is_int(time)) {
    time = Date.now();
  }

  // @TODO - missing getPadSafe() call ?

  // save chat message to database and send message to all connected clients
  padMessageHandler.sendChatMessageToPadClients(time, authorID, text, padID);
}

/*****************/
/**PAD FUNCTIONS */
/*****************/

/**
getRevisionsCount(padID) returns the number of revisions of this pad

Example returns:

{code: 0, message:"ok", data: {revisions: 56}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getRevisionsCount = async function(padID)
{
  // get the pad
  let pad = await getPadSafe(padID, true);
  return { revisions: pad.getHeadRevisionNumber() };
}

/**
getSavedRevisionsCount(padID) returns the number of saved revisions of this pad

Example returns:

{code: 0, message:"ok", data: {savedRevisions: 42}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getSavedRevisionsCount = async function(padID)
{
  // get the pad
  let pad = await getPadSafe(padID, true);
  return { savedRevisions: pad.getSavedRevisionsNumber() };
}

/**
listSavedRevisions(padID) returns the list of saved revisions of this pad

Example returns:

{code: 0, message:"ok", data: {savedRevisions: [2, 42, 1337]}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.listSavedRevisions = async function(padID)
{
  // get the pad
  let pad = await getPadSafe(padID, true);
  return { savedRevisions: pad.getSavedRevisionsList() };
}

/**
saveRevision(padID) returns the list of saved revisions of this pad

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"padID does not exist", data: null}
*/
exports.saveRevision = async function(padID, rev)
{
  // check if rev is a number
  if (rev !== undefined) {
    rev = checkValidRev(rev);
  }

  // get the pad
  let pad = await getPadSafe(padID, true);
  let head = pad.getHeadRevisionNumber();

  // the client asked for a special revision
  if (rev !== undefined) {
    if (rev > head) {
      throw new customError("rev is higher than the head revision of the pad", "apierror");
    }
  } else {
    rev = pad.getHeadRevisionNumber();
  }

  let author = await authorManager.createAuthor('API');
  pad.addSavedRevision(rev, author.authorID, 'Saved through API call');
}

/**
getLastEdited(padID) returns the timestamp of the last revision of the pad

Example returns:

{code: 0, message:"ok", data: {lastEdited: 1340815946602}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getLastEdited = async function(padID)
{
  // get the pad
  let pad = await getPadSafe(padID, true);
  let lastEdited = await pad.getLastEdit();
  return { lastEdited };
}

/**
createPad(padName [, text]) creates a new pad in this group

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"pad does already exist", data: null}
*/
exports.createPad = async function(padID, text)
{
  if (padID) {
    // ensure there is no $ in the padID
    if (padID.indexOf("$") !== -1) {
      throw new customError("createPad can't create group pads", "apierror");
    }

    // check for url special characters
    if (padID.match(/(\/|\?|&|#)/)) {
      throw new customError("malformed padID: Remove special characters", "apierror");
    }
  }

  // create pad
  await getPadSafe(padID, false, text);
}

/**
deletePad(padID) deletes a pad

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"padID does not exist", data: null}
*/
exports.deletePad = async function(padID)
{
  let pad = await getPadSafe(padID, true);
  await pad.remove();
}

/**
 restoreRevision(padID, [rev]) Restores revision from past as new changeset

 Example returns:

 {code:0, message:"ok", data:null}
 {code: 1, message:"padID does not exist", data: null}
 */
exports.restoreRevision = async function(padID, rev)
{
  // check if rev is a number
  if (rev === undefined) {
    throw new customError("rev is not defined", "apierror");
  }
  rev = checkValidRev(rev);

  // get the pad
  let pad = await getPadSafe(padID, true);

  // check if this is a valid revision
  if (rev > pad.getHeadRevisionNumber()) {
    throw new customError("rev is higher than the head revision of the pad", "apierror");
  }

  let atext = await pad.getInternalRevisionAText(rev);

  var oldText = pad.text();
  atext.text += "\n";

  function eachAttribRun(attribs, func) {
    var attribsIter = Changeset.opIterator(attribs);
    var textIndex = 0;
    var newTextStart = 0;
    var newTextEnd = atext.text.length;
    while (attribsIter.hasNext()) {
      var op = attribsIter.next();
      var nextIndex = textIndex + op.chars;
      if (!(nextIndex <= newTextStart || textIndex >= newTextEnd)) {
        func(Math.max(newTextStart, textIndex), Math.min(newTextEnd, nextIndex), op.attribs);
      }
      textIndex = nextIndex;
    }
  }

  // create a new changeset with a helper builder object
  var builder = Changeset.builder(oldText.length);

  // assemble each line into the builder
  eachAttribRun(atext.attribs, function(start, end, attribs) {
    builder.insert(atext.text.substring(start, end), attribs);
  });

  var lastNewlinePos = oldText.lastIndexOf('\n');
  if (lastNewlinePos < 0) {
    builder.remove(oldText.length - 1, 0);
  } else {
    builder.remove(lastNewlinePos, oldText.match(/\n/g).length - 1);
    builder.remove(oldText.length - lastNewlinePos - 1, 0);
  }

  var changeset = builder.toString();

  // append the changeset
  pad.appendRevision(changeset);

  // update the clients on the pad
  padMessageHandler.updatePadClients(pad);
}

/**
copyPad(sourceID, destinationID[, force=false]) copies a pad. If force is true,
  the destination will be overwritten if it exists.

Example returns:

{code: 0, message:"ok", data: {padID: destinationID}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.copyPad = async function(sourceID, destinationID, force)
{
  let pad = await getPadSafe(sourceID, true);
  await pad.copy(destinationID, force);
}

/**
movePad(sourceID, destinationID[, force=false]) moves a pad. If force is true,
  the destination will be overwritten if it exists.

Example returns:

{code: 0, message:"ok", data: {padID: destinationID}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.movePad = async function(sourceID, destinationID, force)
{
  let pad = await getPadSafe(sourceID, true);
  await pad.copy(destinationID, force);
  await pad.remove();
}

/**
getReadOnlyLink(padID) returns the read only link of a pad

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getReadOnlyID = async function(padID)
{
  // we don't need the pad object, but this function does all the security stuff for us
  await getPadSafe(padID, true);

  // get the readonlyId
  let readOnlyID = await readOnlyManager.getReadOnlyId(padID);

  return { readOnlyID };
}

/**
getPadID(roID) returns the padID of a pad based on the readonlyID(roID)

Example returns:

{code: 0, message:"ok", data: {padID: padID}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getPadID = async function(roID)
{
  // get the PadId
  let padID = await readOnlyManager.getPadId(roID);
  if (padID === null) {
    throw new customError("padID does not exist", "apierror");
  }

  return { padID };
}

/**
setPublicStatus(padID, publicStatus) sets a boolean for the public status of a pad

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"padID does not exist", data: null}
*/
exports.setPublicStatus = async function(padID, publicStatus)
{
  // ensure this is a group pad
  checkGroupPad(padID, "publicStatus");

  // get the pad
  let pad = await getPadSafe(padID, true);

  // convert string to boolean
  if (typeof publicStatus === "string") {
    publicStatus = (publicStatus.toLowerCase() === "true");
  }

  // set the password
  pad.setPublicStatus(publicStatus);
}

/**
getPublicStatus(padID) return true of false

Example returns:

{code: 0, message:"ok", data: {publicStatus: true}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getPublicStatus = async function(padID)
{
  // ensure this is a group pad
  checkGroupPad(padID, "publicStatus");

  // get the pad
  let pad = await getPadSafe(padID, true);
  return { publicStatus: pad.getPublicStatus() };
}

/**
setPassword(padID, password) returns ok or a error message

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"padID does not exist", data: null}
*/
exports.setPassword = async function(padID, password)
{
  // ensure this is a group pad
  checkGroupPad(padID, "password");

  // get the pad
  let pad = await getPadSafe(padID, true);

  // set the password
  pad.setPassword(password == "" ? null : password);
}

/**
isPasswordProtected(padID) returns true or false

Example returns:

{code: 0, message:"ok", data: {passwordProtection: true}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.isPasswordProtected = async function(padID)
{
  // ensure this is a group pad
  checkGroupPad(padID, "password");

  // get the pad
  let pad = await getPadSafe(padID, true);
  return { isPasswordProtected: pad.isPasswordProtected() };
}

/**
listAuthorsOfPad(padID) returns an array of authors who contributed to this pad

Example returns:

{code: 0, message:"ok", data: {authorIDs : ["a.s8oes9dhwrvt0zif", "a.akf8finncvomlqva"]}
{code: 1, message:"padID does not exist", data: null}
*/
exports.listAuthorsOfPad = async function(padID)
{
  // get the pad
  let pad = await getPadSafe(padID, true);
  let authorIDs = pad.getAllAuthors();
  return { authorIDs };
}

/**
sendClientsMessage(padID, msg) sends a message to all clients connected to the
pad, possibly for the purpose of signalling a plugin.

Note, this will only accept strings from the HTTP API, so sending bogus changes
or chat messages will probably not be possible.

The resulting message will be structured like so:

{
  type: 'COLLABROOM',
  data: {
    type: <msg>,
    time: <time the message was sent>
  }
}

Example returns:

{code: 0, message:"ok"}
{code: 1, message:"padID does not exist"}
*/

exports.sendClientsMessage = async function(padID, msg) {
  let pad = await getPadSafe(padID, true);
  padMessageHandler.handleCustomMessage(padID, msg);
}

/**
checkToken() returns ok when the current api token is valid

Example returns:

{"code":0,"message":"ok","data":null}
{"code":4,"message":"no or wrong API Key","data":null}
*/
exports.checkToken = async function()
{
}

/**
getChatHead(padID) returns the chatHead (last number of the last chat-message) of the pad

Example returns:

{code: 0, message:"ok", data: {chatHead: 42}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getChatHead = async function(padID)
{
  // get the pad
  let pad = await getPadSafe(padID, true);
  return { chatHead: pad.chatHead };
}

/**
createDiffHTML(padID, startRev, endRev) returns an object of diffs from 2 points in a pad

Example returns:

{"code":0,"message":"ok","data":{"html":"<style>\n.authora_HKIv23mEbachFYfH {background-color: #a979d9}\n.authora_n4gEeMLsv1GivNeh {background-color: #a9b5d9}\n.removed {text-decoration: line-through; -ms-filter:'progid:DXImageTransform.Microsoft.Alpha(Opacity=80)'; filter: alpha(opacity=80); opacity: 0.8; }\n</style>Welcome to Etherpad!<br><br>This pad text is synchronized as you type, so that everyone viewing this page sees the same text. This allows you to collaborate seamlessly on documents!<br><br>Get involved with Etherpad at <a href=\"http&#x3a;&#x2F;&#x2F;etherpad&#x2e;org\">http:&#x2F;&#x2F;etherpad.org</a><br><span class=\"authora_HKIv23mEbachFYfH\">aw</span><br><br>","authors":["a.HKIv23mEbachFYfH",""]}}
{"code":4,"message":"no or wrong API Key","data":null}
*/
exports.createDiffHTML = async function(padID, startRev, endRev) {

  // check if startRev is a number
  if (startRev !== undefined) {
    startRev = checkValidRev(startRev);
  }

  // check if endRev is a number
  if (endRev !== undefined) {
    endRev = checkValidRev(endRev);
  }

  // get the pad
  let pad = await getPadSafe(padID, true);
  try {
    var padDiff = new PadDiff(pad, startRev, endRev);
  } catch (e) {
    throw { stop: e.message };
  }

  let html = await padDiff.getHtml();
  let authors = await padDiff.getAuthors();

  return { html, authors };
}

/**********************/
/** GLOBAL FUNCTIONS **/
/**********************/

/**
 getStats() returns an json object with some instance stats

 Example returns:

 {"code":0,"message":"ok","data":{"totalPads":3,"totalSessions": 2,"totalActivePads": 1}}
 {"code":4,"message":"no or wrong API Key","data":null}
 */

exports.getStats = async function() {
  const sessionInfos = padMessageHandler.sessioninfos;

  const sessionKeys = Object.keys(sessionInfos);
  const activePads = new Set(Object.entries(sessionInfos).map(k => k[1].padId));

  const { padIDs } = await padManager.listAllPads();

  return {
    totalPads: padIDs.length,
    totalSessions: sessionKeys.length,
    totalActivePads: activePads.size,
  }
}

/******************************/
/** INTERNAL HELPER FUNCTIONS */
/******************************/

// checks if a number is an int
function is_int(value)
{
  return (parseFloat(value) == parseInt(value, 10)) && !isNaN(value)
}

// gets a pad safe
async function getPadSafe(padID, shouldExist, text)
{
  // check if padID is a string
  if (typeof padID !== "string") {
    throw new customError("padID is not a string", "apierror");
  }

  // check if the padID maches the requirements
  if (!padManager.isValidPadId(padID)) {
    throw new customError("padID did not match requirements", "apierror");
  }

  // check if the pad exists
  let exists = await padManager.doesPadExists(padID);

  if (!exists && shouldExist) {
    // does not exist, but should
    throw new customError("padID does not exist", "apierror");
  }

  if (exists && !shouldExist) {
    // does exist, but shouldn't
    throw new customError("padID does already exist", "apierror");
  }

  // pad exists, let's get it
  return padManager.getPad(padID, text);
}

// checks if a rev is a legal number
// pre-condition is that `rev` is not undefined
function checkValidRev(rev)
{
  if (typeof rev !== "number") {
    rev = parseInt(rev, 10);
  }

  // check if rev is a number
  if (isNaN(rev)) {
    throw new customError("rev is not a number", "apierror");
  }

  // ensure this is not a negative number
  if (rev < 0) {
    throw new customError("rev is not a negative number", "apierror");
  }

  // ensure this is not a float value
  if (!is_int(rev)) {
    throw new customError("rev is a float value", "apierror");
  }

  return rev;
}

// checks if a padID is part of a group
function checkGroupPad(padID, field)
{
  // ensure this is a group pad
  if (padID && padID.indexOf("$") === -1) {
    throw new customError(`You can only get/set the ${field} of pads that belong to a group`, "apierror");
  }
}
