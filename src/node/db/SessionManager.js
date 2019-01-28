/**
 * The Session Manager provides functions to manage session in the database, it only provides session management for sessions created by the API
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

var customError = require("../utils/customError");
var randomString = require("../utils/randomstring");
var db = require("./DB");
var groupManager = require("./GroupManager");
var authorManager = require("./AuthorManager");

exports.doesSessionExist = async function(sessionID)
{
  //check if the database entry of this session exists
  let session = await db.get("session:" + sessionID);
  return (session !== null);
}

/**
 * Creates a new session between an author and a group
 */
exports.createSession = async function(groupID, authorID, validUntil)
{
  // check if the group exists
  let groupExists = await groupManager.doesGroupExist(groupID);
  if (!groupExists) {
    throw new customError("groupID does not exist", "apierror");
  }

  // check if the author exists
  let authorExists = await authorManager.doesAuthorExist(authorID);
  if (!authorExists) {
    throw new customError("authorID does not exist", "apierror");
  }

  // try to parse validUntil if it's not a number
  if (typeof validUntil !== "number") {
    validUntil = parseInt(validUntil);
  }

  // check it's a valid number
  if (isNaN(validUntil)) {
    throw new customError("validUntil is not a number", "apierror");
  }

  // ensure this is not a negative number
  if (validUntil < 0) {
    throw new customError("validUntil is a negative number", "apierror");
  }

  // ensure this is not a float value
  if (!is_int(validUntil)) {
    throw new customError("validUntil is a float value", "apierror");
  }

  // check if validUntil is in the future
  if (validUntil < Math.floor(Date.now() / 1000)) {
    throw new customError("validUntil is in the past", "apierror");
  }

  // generate sessionID
  let sessionID = "s." + randomString(16);

  // set the session into the database
  await db.set("session:" + sessionID, {"groupID": groupID, "authorID": authorID, "validUntil": validUntil});

  // get the entry
  let group2sessions = await db.get("group2sessions:" + groupID);

  /*
   * In some cases, the db layer could return "undefined" as well as "null".
   * Thus, it is not possible to perform strict null checks on group2sessions.
   * In a previous version of this code, a strict check broke session
   * management.
   *
   * See: https://github.com/ether/etherpad-lite/issues/3567#issuecomment-468613960
   */
  if (!group2sessions || !group2sessions.sessionIDs) {
    // the entry doesn't exist so far, let's create it
    group2sessions = {sessionIDs : {}};
  }

  // add the entry for this session
  group2sessions.sessionIDs[sessionID] = 1;

  // save the new element back
  await db.set("group2sessions:" + groupID, group2sessions);

  // get the author2sessions entry
  let author2sessions = await db.get("author2sessions:" + authorID);

  if (author2sessions == null || author2sessions.sessionIDs == null) {
    // the entry doesn't exist so far, let's create it
    author2sessions = {sessionIDs : {}};
  }

  // add the entry for this session
  author2sessions.sessionIDs[sessionID] = 1;

  //save the new element back
  await db.set("author2sessions:" + authorID, author2sessions);

  return { sessionID };
}

exports.getSessionInfo = async function(sessionID)
{
  // check if the database entry of this session exists
  let session = await db.get("session:" + sessionID);

  if (session == null) {
    // session does not exist
    throw new customError("sessionID does not exist", "apierror");
  }

  // everything is fine, return the sessioninfos
  return session;
}

/**
 * Deletes a session
 */
exports.deleteSession = async function(sessionID)
{
  // ensure that the session exists
  let session = await db.get("session:" + sessionID);
  if (session == null) {
    throw new customError("sessionID does not exist", "apierror");
  }

  // everything is fine, use the sessioninfos
  let groupID = session.groupID;
  let authorID = session.authorID;

  // get the group2sessions and author2sessions entries
  let group2sessions = await db.get("group2sessions:" + groupID);
  let author2sessions = await db.get("author2sessions:" + authorID);

  // remove the session
  await db.remove("session:" + sessionID);

  // remove session from group2sessions
  if (group2sessions != null) { // Maybe the group was already deleted
    delete group2sessions.sessionIDs[sessionID];
    await db.set("group2sessions:" + groupID, group2sessions);
  }

  // remove session from author2sessions
  if (author2sessions != null) { // Maybe the author was already deleted
    delete author2sessions.sessionIDs[sessionID];
    await db.set("author2sessions:" + authorID, author2sessions);
  }
}

exports.listSessionsOfGroup = async function(groupID)
{
  // check that the group exists
  let exists = await groupManager.doesGroupExist(groupID);
  if (!exists) {
    throw new customError("groupID does not exist", "apierror");
  }

  let sessions = await listSessionsWithDBKey("group2sessions:" + groupID);
  return sessions;
}

exports.listSessionsOfAuthor = async function(authorID)
{
  // check that the author exists
  let exists = await authorManager.doesAuthorExist(authorID)
  if (!exists) {
    throw new customError("authorID does not exist", "apierror");
  }

  let sessions = await listSessionsWithDBKey("author2sessions:" + authorID);
  return sessions;
}

// this function is basically the code listSessionsOfAuthor and listSessionsOfGroup has in common
// required to return null rather than an empty object if there are none
async function listSessionsWithDBKey(dbkey)
{
  // get the group2sessions entry
  let sessionObject = await db.get(dbkey);
  let sessions = sessionObject ? sessionObject.sessionIDs : null;

  // iterate through the sessions and get the sessioninfos
  for (let sessionID in sessions) {
    try {
      let sessionInfo = await exports.getSessionInfo(sessionID);
      sessions[sessionID] = sessionInfo;
    } catch (err) {
      if (err == "apierror: sessionID does not exist") {
        console.warn(`Found bad session ${sessionID} in ${dbkey}`);
        sessions[sessionID] = null;
      } else {
        throw err;
      }
    }
  }

  return sessions;
}

// checks if a number is an int
function is_int(value)
{
  return (parseFloat(value) == parseInt(value)) && !isNaN(value);
}
