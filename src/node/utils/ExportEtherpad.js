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


const db = require('../db/DB');
const hooks = require('../../static/js/pluginfw/hooks');

exports.getPadRaw = async (padId, readOnlyId) => {
  const keyPrefixRead = `pad:${padId}`;
  const keyPrefixWrite = readOnlyId ? `pad:${readOnlyId}` : keyPrefixRead;
  const padcontent = await db.get(keyPrefixRead);

  const keySuffixes = [''];
  for (let i = 0; i <= padcontent.head; i++) keySuffixes.push(`:revs:${i}`);
  for (let i = 0; i <= padcontent.chatHead; i++) keySuffixes.push(`:chat:${i}`);

  const data = {};
  for (const keySuffix of keySuffixes) {
    const entry = data[keyPrefixWrite + keySuffix] = await db.get(keyPrefixRead + keySuffix);

    // Get the Pad Authors
    if (entry.pool && entry.pool.numToAttrib) {
      const authors = entry.pool.numToAttrib;

      for (const k of Object.keys(authors)) {
        if (authors[k][0] === 'author') {
          const authorId = authors[k][1];

          // Get the author info
          const authorEntry = await db.get(`globalAuthor:${authorId}`);
          if (authorEntry) {
            data[`globalAuthor:${authorId}`] = authorEntry;
            if (authorEntry.padIDs) {
              authorEntry.padIDs = readOnlyId || padId;
            }
          }
        }
      }
    }
  }

  // get content that has a different prefix IE comments:padId:foo
  // a plugin would return something likle ['comments', 'cakes']
  const prefixes = await hooks.aCallAll('exportEtherpadAdditionalContent');
  await Promise.all(prefixes.map(async (prefix) => {
    const key = `${prefix}:${padId}`;
    const writeKey = readOnlyId ? `${prefix}:${readOnlyId}` : key;
    data[writeKey] = await db.get(key);
  }));

  return data;
};
