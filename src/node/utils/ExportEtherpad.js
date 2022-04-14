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
const hooks = require('../../static/js/pluginfw/hooks');
const padManager = require('../db/PadManager');

exports.getPadRaw = async (padId, readOnlyId) => {
  const pad = await padManager.getPad(padId);
  const pfx = `pad:${readOnlyId || padId}`;
  const data = {[pfx]: pad};
  for (const authorId of pad.getAllAuthors()) {
    const authorEntry = await authorManager.getAuthor(authorId);
    if (!authorEntry) continue;
    data[`globalAuthor:${authorId}`] = authorEntry;
    if (!authorEntry.padIDs) continue;
    authorEntry.padIDs = readOnlyId || padId;
  }
  for (let i = 0; i <= pad.head; ++i) data[`${pfx}:revs:${i}`] = await pad.getRevision(i);
  for (let i = 0; i <= pad.chatHead; ++i) data[`${pfx}:chat:${i}`] = await pad.getChatMessage(i);
  const prefixes = await hooks.aCallAll('exportEtherpadAdditionalContent');
  await Promise.all(prefixes.map(async (prefix) => {
    data[`${prefix}:${readOnlyId || padId}`] = await pad.db.get(`${prefix}:${padId}`);
  }));
  return data;
};
