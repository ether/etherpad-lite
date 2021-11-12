'use strict';
/**
 * The Session Manager provides functions to manage session in the database,
 * it only provides session management for sessions created by the API
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

const CustomError = require('../utils/customError');
const promises = require('../utils/promises');
const randomString = require('../utils/randomstring');
const db = require('./DB');
const groupManager = require('./GroupManager');
const authorManager = require('./AuthorManager');

/**
 * Finds the author ID for a session with matching ID and group.
 *
 * @param groupID identifies the group the session is bound to.
 * @param sessionCookie contains a comma-separated list of IDs identifying the sessions to search.
 * @return If there is a session that is not expired, has an ID matching one of the session IDs in
 *     sessionCookie, and is bound to a group with the given ID, then this returns the author ID
 *     bound to the session. Otherwise, returns undefined.
 */
exports.findAuthorID = async (groupID, sessionCookie) => {
  if (!sessionCookie) return undefined;
  /*
   * Sometimes, RFC 6265-compliant web servers may send back a cookie whose
   * value is enclosed in double quotes, such as:
   *
   *   Set-Cookie: sessionCookie="s.37cf5299fbf981e14121fba3a588c02b,
   * s.2b21517bf50729d8130ab85736a11346"; Version=1; Path=/; Domain=localhost; Discard
   *
   * Where the double quotes at the start and the end of the header value are
   * just delimiters. This is perfectly legal: Etherpad parsing logic should
   * cope with that, and remove the quotes early in the request phase.
   *
   * Somehow, this does not happen, and in such cases the actual value that
   * sessionCookie ends up having is:
   *
   *     sessionCookie = '"s.37cf5299fbf981e14121fba3a588c02b,s.2b21517bf50729d8130ab85736a11346"'
   *
   * As quick measure, let's strip the double quotes (when present).
   * Note that here we are being minimal, limiting ourselves to just removing
   * quotes at the start and the end of the string.
   *
   * Fixes #3819.
   * Also, see #3820.
   */
  const sessionIDs = sessionCookie.replace(/^"|"$/g, '').split(',');
  const sessionInfoPromises = sessionIDs.map(async (id) => {
    try {
      return await exports.getSessionInfo(id);
    } catch (err) {
      if (err.message === 'sessionID does not exist') {
        console.debug(`SessionManager getAuthorID: no session exists with ID ${id}`);
      } else {
        throw err;
      }
    }
    return undefined;
  });
  const now = Math.floor(Date.now() / 1000);
  const isMatch = (si) => (si != null && si.groupID === groupID && now < si.validUntil);
  const sessionInfo = await promises.firstSatisfies(sessionInfoPromises, isMatch);
  if (sessionInfo == null) return undefined;
  return sessionInfo.authorID;
};

exports.doesSessionExist = async (sessionID) => {
  // check if the database entry of this session exists
  const session = await db.get(`session:${sessionID}`);
  return (session != null);
};

/**
 * Creates a new session between an author and a group
 */
exports.createSession = async (groupID, authorID, validUntil) => {
  // check if the group exists
  const groupExists = await groupManager.doesGroupExist(groupID);
  if (!groupExists) {
    throw new CustomError('groupID does not exist', 'apierror');
  }

  // check if the author exists
  const authorExists = await authorManager.doesAuthorExist(authorID);
  if (!authorExists) {
    throw new CustomError('authorID does not exist', 'apierror');
  }

  // try to parse validUntil if it's not a number
  if (typeof validUntil !== 'number') {
    validUntil = parseInt(validUntil);
  }

  // check it's a valid number
  if (isNaN(validUntil)) {
    throw new CustomError('validUntil is not a number', 'apierror');
  }

  // ensure this is not a negative number
  if (validUntil < 0) {
    throw new CustomError('validUntil is a negative number', 'apierror');
  }

  // ensure this is not a float value
  if (!isInt(validUntil)) {
    throw new CustomError('validUntil is a float value', 'apierror');
  }

  // check if validUntil is in the future
  if (validUntil < Math.floor(Date.now() / 1000)) {
    throw new CustomError('validUntil is in the past', 'apierror');
  }

  // generate sessionID
  const sessionID = `s.${randomString(16)}`;

  // set the session into the database
  await db.set(`session:${sessionID}`, {groupID, authorID, validUntil});

  // get the entry
  let group2sessions = await db.get(`group2sessions:${groupID}`);

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
    group2sessions = {sessionIDs: {}};
  }

  // add the entry for this session
  group2sessions.sessionIDs[sessionID] = 1;

  // save the new element back
  await db.set(`group2sessions:${groupID}`, group2sessions);

  // get the author2sessions entry
  let author2sessions = await db.get(`author2sessions:${authorID}`);

  if (author2sessions == null || author2sessions.sessionIDs == null) {
    // the entry doesn't exist so far, let's create it
    author2sessions = {sessionIDs: {}};
  }

  // add the entry for this session
  author2sessions.sessionIDs[sessionID] = 1;

  // save the new element back
  await db.set(`author2sessions:${authorID}`, author2sessions);

  return {sessionID};
};

exports.getSessionInfo = async (sessionID) => {
  // check if the database entry of this session exists
  const session = await db.get(`session:${sessionID}`);

  if (session == null) {
    // session does not exist
    throw new CustomError('sessionID does not exist', 'apierror');
  }

  // everything is fine, return the sessioninfos
  return session;
};

/**
 * Deletes a session
 */
exports.deleteSession = async (sessionID) => {
  // ensure that the session exists
  const session = await db.get(`session:${sessionID}`);
  if (session == null) {
    throw new CustomError('sessionID does not exist', 'apierror');
  }

  // everything is fine, use the sessioninfos
  const groupID = session.groupID;
  const authorID = session.authorID;

  // get the group2sessions and author2sessions entries
  const group2sessions = await db.get(`group2sessions:${groupID}`);
  const author2sessions = await db.get(`author2sessions:${authorID}`);

  // remove the session
  await db.remove(`session:${sessionID}`);

  // remove session from group2sessions
  if (group2sessions != null) { // Maybe the group was already deleted
    delete group2sessions.sessionIDs[sessionID];
    await db.set(`group2sessions:${groupID}`, group2sessions);
  }

  // remove session from author2sessions
  if (author2sessions != null) { // Maybe the author was already deleted
    delete author2sessions.sessionIDs[sessionID];
    await db.set(`author2sessions:${authorID}`, author2sessions);
  }
};

exports.listSessionsOfGroup = async (groupID) => {
  // check that the group exists
  const exists = await groupManager.doesGroupExist(groupID);
  if (!exists) {
    throw new CustomError('groupID does not exist', 'apierror');
  }

  const sessions = await listSessionsWithDBKey(`group2sessions:${groupID}`);
  return sessions;
};

exports.listSessionsOfAuthor = async (authorID) => {
  // check that the author exists
  const exists = await authorManager.doesAuthorExist(authorID);
  if (!exists) {
    throw new CustomError('authorID does not exist', 'apierror');
  }

  const sessions = await listSessionsWithDBKey(`author2sessions:${authorID}`);
  return sessions;
};

// this function is basically the code listSessionsOfAuthor and listSessionsOfGroup has in common
// required to return null rather than an empty object if there are none
const listSessionsWithDBKey = async (dbkey) => {
  // get the group2sessions entry
  const sessionObject = await db.get(dbkey);
  const sessions = sessionObject ? sessionObject.sessionIDs : null;

  // iterate through the sessions and get the sessioninfos
  for (const sessionID of Object.keys(sessions || {})) {
    try {
      const sessionInfo = await exports.getSessionInfo(sessionID);
      sessions[sessionID] = sessionInfo;
    } catch (err) {
      if (err.name === 'apierror') {
        console.warn(`Found bad session ${sessionID} in ${dbkey}`);
        sessions[sessionID] = null;
      } else {
        throw err;
      }
    }
  }

  return sessions;
};

// checks if a number is an int
const isInt = (value) => (parseFloat(value) === parseInt(value)) && !isNaN(value);
