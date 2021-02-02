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

exports.getPadRaw = async (padId) => {
  const padKey = `pad:${padId}`;
  const padcontent = await db.get(padKey);

  const records = [padKey];
  for (let i = 0; i <= padcontent.head; i++) {
    records.push(`${padKey}:revs:${i}`);
  }

  for (let i = 0; i <= padcontent.chatHead; i++) {
    records.push(`${padKey}:chat:${i}`);
  }

  const data = {};
  for (const key of records) {
    // For each piece of info about a pad.
    const entry = data[key] = await db.get(key);

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
              authorEntry.padIDs = padId;
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
    data[key] = await db.get(key);
  }));

  return data;
};
