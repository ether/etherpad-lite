'use strict';

/**
 * 2014 John McLear (Etherpad Foundation / McLear Ltd)
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

const authorManager = require('../db/AuthorManager');
const db = require('../db/DB');
const hooks = require('../../static/js/pluginfw/hooks');
const log4js = require('log4js');
const supportedElems = require('../../static/js/contentcollector').supportedElems;

const logger = log4js.getLogger('ImportEtherpad');

exports.setPadRaw = async (padId, r) => {
  const records = JSON.parse(r);

  // get supported block Elements from plugins, we will use this later.
  hooks.callAll('ccRegisterBlockElements').forEach((element) => {
    supportedElems.add(element);
  });

  const unsupportedElements = new Set();

  // DB key prefixes for pad records. Each key is expected to have the form `${prefix}:${padId}` or
  // `${prefix}:${padId}:${otherstuff}`.
  const padKeyPrefixes = [
    ...await hooks.aCallAll('exportEtherpadAdditionalContent'),
    'pad',
  ];

  let originalPadId = null;
  const checkOriginalPadId = (padId) => {
    if (originalPadId == null) originalPadId = padId;
    if (originalPadId !== padId) throw new Error('unexpected pad ID in record');
  };

  await Promise.all(Object.entries(records).map(async ([key, value]) => {
    if (!value) {
      return;
    }
    const keyParts = key.split(':');
    const [prefix, id] = keyParts;
    if (prefix === 'globalAuthor' && keyParts.length === 2) {
      // In the database, the padIDs subkey is an object (which is used as a set) that records every
      // pad the author has worked on. When exported, that object becomes a single string containing
      // the exported pad's ID.
      if (typeof value.padIDs !== 'string') {
        throw new TypeError('globalAuthor padIDs subkey is not a string');
      }
      checkOriginalPadId(value.padIDs);
      if (await authorManager.doesAuthorExist(id)) {
        await authorManager.addPad(id, padId);
        return;
      }
      value.padIDs = {[padId]: 1};
    } else if (padKeyPrefixes.includes(prefix)) {
      checkOriginalPadId(id);
      if (prefix === 'pad' && keyParts.length === 2 && value.pool) {
        for (const [k] of Object.values(value.pool.numToAttrib)) {
          if (!supportedElems.has(k)) unsupportedElements.add(k);
        }
      }
      keyParts[1] = padId;
      key = keyParts.join(':');
    } else {
      logger.warn(`(pad ${padId}) Ignoring record with unsupported key: ${key}`);
      return;
    }
    await db.set(key, value);
  }));

  if (unsupportedElements.size) {
    logger.warn('Ignoring unsupported elements (you might want to install a plugin): ' +
                `${[...unsupportedElements].join(', ')}`);
  }
};
