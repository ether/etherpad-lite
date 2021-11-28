'use strict';
/**
 * The Group Manager provides functions to manage groups in the database
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
const randomString = require('../../static/js/pad_utils').randomString;
const db = require('./DB');
const padManager = require('./PadManager');
const sessionManager = require('./SessionManager');

exports.listAllGroups = async () => {
  let groups = await db.get('groups');
  groups = groups || {};

  const groupIDs = Object.keys(groups);
  return {groupIDs};
};

exports.deleteGroup = async (groupID) => {
  const group = await db.get(`group:${groupID}`);

  // ensure group exists
  if (group == null) {
    // group does not exist
    throw new CustomError('groupID does not exist', 'apierror');
  }

  // iterate through all pads of this group and delete them (in parallel)
  await Promise.all(Object.keys(group.pads).map(async (padId) => {
    const pad = await padManager.getPad(padId);
    await pad.remove();
  }));

  // Delete associated sessions in parallel. This should be done before deleting the group2sessions
  // record because deleting a session updates the group2sessions record.
  const {sessionIDs = {}} = await db.get(`group2sessions:${groupID}`) || {};
  await Promise.all(Object.keys(sessionIDs).map(async (sessionId) => {
    await sessionManager.deleteSession(sessionId);
  }));

  await Promise.all([
    db.remove(`group2sessions:${groupID}`),
    // UeberDB's setSub() method atomically reads the record, updates the appropriate property, and
    // writes the result. Setting a property to `undefined` deletes that property (JSON.stringify()
    // ignores such properties).
    db.setSub('groups', [groupID], undefined),
    ...Object.keys(group.mappings || {}).map(async (m) => await db.remove(`mapper2group:${m}`)),
  ]);

  // Remove the group record after updating the `groups` record so that the state is consistent.
  await db.remove(`group:${groupID}`);
};

exports.doesGroupExist = async (groupID) => {
  // try to get the group entry
  const group = await db.get(`group:${groupID}`);

  return (group != null);
};

exports.createGroup = async () => {
  const groupID = `g.${randomString(16)}`;
  await db.set(`group:${groupID}`, {pads: {}, mappings: {}});
  // Add the group to the `groups` record after the group's individual record is created so that
  // the state is consistent. Note: UeberDB's setSub() method atomically reads the record, updates
  // the appropriate property, and writes the result.
  await db.setSub('groups', [groupID], 1);
  return {groupID};
};

exports.createGroupIfNotExistsFor = async (groupMapper) => {
  if (typeof groupMapper !== 'string') {
    throw new CustomError('groupMapper is not a string', 'apierror');
  }
  const groupID = await db.get(`mapper2group:${groupMapper}`);
  if (groupID && await exports.doesGroupExist(groupID)) return {groupID};
  const result = await exports.createGroup();
  await Promise.all([
    db.set(`mapper2group:${groupMapper}`, result.groupID),
    // Remember the mapping in the group record so that it can be cleaned up when the group is
    // deleted. Although the core Etherpad API does not support multiple mappings for the same
    // group, the database record does support multiple mappings in case a plugin decides to extend
    // the core Etherpad functionality. (It's also easy to implement it this way.)
    db.setSub(`group:${result.groupID}`, ['mappings', groupMapper], 1),
  ]);
  return result;
};

exports.createGroupPad = async (groupID, padName, text) => {
  // create the padID
  const padID = `${groupID}$${padName}`;

  // ensure group exists
  const groupExists = await exports.doesGroupExist(groupID);

  if (!groupExists) {
    throw new CustomError('groupID does not exist', 'apierror');
  }

  // ensure pad doesn't exist already
  const padExists = await padManager.doesPadExists(padID);

  if (padExists) {
    // pad exists already
    throw new CustomError('padName does already exist', 'apierror');
  }

  // create the pad
  await padManager.getPad(padID, text);

  // create an entry in the group for this pad
  await db.setSub(`group:${groupID}`, ['pads', padID], 1);

  return {padID};
};

exports.listPads = async (groupID) => {
  const exists = await exports.doesGroupExist(groupID);

  // ensure the group exists
  if (!exists) {
    throw new CustomError('groupID does not exist', 'apierror');
  }

  // group exists, let's get the pads
  const result = await db.getSub(`group:${groupID}`, ['pads']);
  const padIDs = Object.keys(result);

  return {padIDs};
};
