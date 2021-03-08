'use strict';

/**
 * The DB Module provides a database initialized with the settings
 * provided by the settings module
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

const ueberDB = require('ueberdb2');
const settings = require('../utils/Settings');
const log4js = require('log4js');
const stats = require('../stats');
const util = require('util');

// set database settings
const db =
    new ueberDB.database(settings.dbType, settings.dbSettings, null, log4js.getLogger('ueberDB'));

/**
 * The UeberDB Object that provides the database functions
 */
exports.db = null;

/**
 * Initializes the database with the settings provided by the settings module
 * @param {Function} callback
 */
exports.init = async () => await new Promise((resolve, reject) => {
  db.init((err) => {
    if (err) {
      // there was an error while initializing the database, output it and stop
      console.error('ERROR: Problem while initalizing the database');
      console.error(err.stack ? err.stack : err);
      process.exit(1);
    }

    if (db.metrics != null) {
      for (const [metric, value] of Object.entries(db.metrics)) {
        if (typeof value !== 'number') continue;
        stats.gauge(`ueberdb_${metric}`, () => db.metrics[metric]);
      }
    }

    // everything ok, set up Promise-based methods
    ['get', 'set', 'findKeys', 'getSub', 'setSub', 'remove'].forEach((fn) => {
      exports[fn] = util.promisify(db[fn].bind(db));
    });

    // set up wrappers for get and getSub that can't return "undefined"
    const get = exports.get;
    exports.get = async (key) => {
      const result = await get(key);
      return (result === undefined) ? null : result;
    };

    const getSub = exports.getSub;
    exports.getSub = async (key, sub) => {
      const result = await getSub(key, sub);
      return (result === undefined) ? null : result;
    };

    // exposed for those callers that need the underlying raw API
    exports.db = db;
    resolve();
  });
});

exports.shutdown = async (hookName, context) => {
  await util.promisify(db.close.bind(db))();
  console.log('Database closed');
};
