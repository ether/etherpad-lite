// 'use strict';
// Uncommenting above breaks tests.
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
const log4js = require('log4js');
const supportedElems = require('../../static/js/contentcollector').supportedElems;

const logger = log4js.getLogger('ImportEtherpad');

exports.setPadRaw = (padId, r) => {
  const records = JSON.parse(r);

  // get supported block Elements from plugins, we will use this later.
  hooks.callAll('ccRegisterBlockElements').forEach((element) => {
    supportedElems.add(element);
  });

  const unsupportedElements = new Set();

  Object.keys(records).forEach(async (key) => {
    let value = records[key];

    if (!value) {
      return;
    }

    let newKey;

    if (value.padIDs) {
      // Author data - rewrite author pad ids
      value.padIDs[padId] = 1;
      newKey = key;

      // Does this author already exist?
      const author = await db.get(key);

      if (author) {
        // Yes, add the padID to the author
        if (Object.prototype.toString.call(author) === '[object Array]') {
          author.padIDs.push(padId);
        }

        value = author;
      } else {
        // No, create a new array with the author info in
        value.padIDs = [padId];
      }
    } else {
      // Not author data, probably pad data
      // we can split it to look to see if it's pad data

      // is this an attribute we support or not?  If not, tell the admin
      if (value.pool) {
        for (const attrib of Object.keys(value.pool.numToAttrib)) {
          const attribName = value.pool.numToAttrib[attrib][0];
          if (!supportedElems.has(attribName)) unsupportedElements.add(attribName);
        }
      }
      const oldPadId = key.split(':');

      // we know it's pad data
      if (oldPadId[0] === 'pad') {
        // so set the new pad id for the author
        oldPadId[1] = padId;

        // and create the value
        newKey = oldPadId.join(':'); // create the new key
      }

      // is this a key that is supported through a plugin?
      // get content that has a different prefix IE comments:padId:foo
      // a plugin would return something likle ['comments', 'cakes']
      for (const prefix of await hooks.aCallAll('exportEtherpadAdditionalContent')) {
        if (prefix === oldPadId[0]) newKey = `${prefix}:${padId}`;
      }
    }

    // Write the value to the server
    await db.set(newKey, value);
  });

  if (unsupportedElements.size) {
    logger.warn('Ignoring unsupported elements (you might want to install a plugin): ' +
                `${[...unsupportedElements].join(', ')}`);
  }
};
