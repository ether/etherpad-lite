'use strict';
/**
 * The API Handler handles all API http requests
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

const absolutePaths = require('../utils/AbsolutePaths');
const fs = require('fs');
const api = require('../db/API');
const log4js = require('log4js');
const padManager = require('../db/PadManager');
const randomString = require('../utils/randomstring');
const argv = require('../utils/Cli').argv;
const createHTTPError = require('http-errors');

const apiHandlerLogger = log4js.getLogger('APIHandler');

// ensure we have an apikey
let apikey = null;
const apikeyFilename = absolutePaths.makeAbsolute(argv.apikey || './APIKEY.txt');

try {
  apikey = fs.readFileSync(apikeyFilename, 'utf8');
  apiHandlerLogger.info(`Api key file read from: "${apikeyFilename}"`);
} catch (e) {
  apiHandlerLogger.info(
      `Api key file "${apikeyFilename}" not found.  Creating with random contents.`);
  apikey = randomString(32);
  fs.writeFileSync(apikeyFilename, apikey, 'utf8');
}

// a list of all functions
const version = {};

version['1'] = Object.assign({},
    {createGroup: [],
      createGroupIfNotExistsFor: ['groupMapper'],
      deleteGroup: ['groupID'],
      listPads: ['groupID'],
      createPad: ['padID', 'text'],
      createGroupPad: ['groupID', 'padName', 'text'],
      createAuthor: ['name'],
      createAuthorIfNotExistsFor: ['authorMapper', 'name'],
      listPadsOfAuthor: ['authorID'],
      createSession: ['groupID', 'authorID', 'validUntil'],
      deleteSession: ['sessionID'],
      getSessionInfo: ['sessionID'],
      listSessionsOfGroup: ['groupID'],
      listSessionsOfAuthor: ['authorID'],
      getText: ['padID', 'rev'],
      setText: ['padID', 'text'],
      getHTML: ['padID', 'rev'],
      setHTML: ['padID', 'html'],
      getRevisionsCount: ['padID'],
      getLastEdited: ['padID'],
      deletePad: ['padID'],
      getReadOnlyID: ['padID'],
      setPublicStatus: ['padID', 'publicStatus'],
      getPublicStatus: ['padID'],
      listAuthorsOfPad: ['padID'],
      padUsersCount: ['padID']}
);

version['1.1'] = Object.assign({}, version['1'],
    {getAuthorName: ['authorID'],
      padUsers: ['padID'],
      sendClientsMessage: ['padID', 'msg'],
      listAllGroups: []}
);

version['1.2'] = Object.assign({}, version['1.1'],
    {checkToken: []}
);

version['1.2.1'] = Object.assign({}, version['1.2'],
    {listAllPads: []}
);

version['1.2.7'] = Object.assign({}, version['1.2.1'],
    {createDiffHTML: ['padID', 'startRev', 'endRev'],
      getChatHistory: ['padID', 'start', 'end'],
      getChatHead: ['padID']}
);

version['1.2.8'] = Object.assign({}, version['1.2.7'],
    {getAttributePool: ['padID'],
      getRevisionChangeset: ['padID', 'rev']}
);

version['1.2.9'] = Object.assign({}, version['1.2.8'],
    {copyPad: ['sourceID', 'destinationID', 'force'],
      movePad: ['sourceID', 'destinationID', 'force']}
);

version['1.2.10'] = Object.assign({}, version['1.2.9'],
    {getPadID: ['roID']}
);

version['1.2.11'] = Object.assign({}, version['1.2.10'],
    {getSavedRevisionsCount: ['padID'],
      listSavedRevisions: ['padID'],
      saveRevision: ['padID', 'rev'],
      restoreRevision: ['padID', 'rev']}
);

version['1.2.12'] = Object.assign({}, version['1.2.11'],
    {appendChatMessage: ['padID', 'text', 'authorID', 'time']}
);

version['1.2.13'] = Object.assign({}, version['1.2.12'],
    {appendText: ['padID', 'text']}
);

version['1.2.14'] = Object.assign({}, version['1.2.13'],
    {getStats: []}
);

version['1.2.15'] = Object.assign({}, version['1.2.14'],
    {copyPadWithoutHistory: ['sourceID', 'destinationID', 'force']}
);

// set the latest available API version here
exports.latestApiVersion = '1.2.15';

// exports the versions so it can be used by the new Swagger endpoint
exports.version = version;

/**
 * Handles a HTTP API call
 * @param functionName the name of the called function
 * @param fields the params of the called function
 * @req express request object
 * @res express response object
 */
exports.handle = async function (apiVersion, functionName, fields, req, res) {
  // say goodbye if this is an unknown API version
  if (!(apiVersion in version)) {
    throw new createHTTPError.NotFound('no such api version');
  }

  // say goodbye if this is an unknown function
  if (!(functionName in version[apiVersion])) {
    throw new createHTTPError.NotFound('no such function');
  }

  // check the api key!
  fields.apikey = fields.apikey || fields.api_key;

  if (fields.apikey !== apikey.trim()) {
    throw new createHTTPError.Unauthorized('no or wrong API Key');
  }

  // sanitize any padIDs before continuing
  if (fields.padID) {
    fields.padID = await padManager.sanitizePadId(fields.padID);
  }
  // there was an 'else' here before - removed it to ensure
  // that this sanitize step can't be circumvented by forcing
  // the first branch to be taken
  if (fields.padName) {
    fields.padName = await padManager.sanitizePadId(fields.padName);
  }

  // put the function parameters in an array
  const functionParams = version[apiVersion][functionName].map((field) => fields[field]);

  // call the api function
  return api[functionName].apply(this, functionParams);
};

exports.exportedForTestingOnly = {
  apiKey: apikey,
};
