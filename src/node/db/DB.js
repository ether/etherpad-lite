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

import ueberDB from 'ueberdb2';

import {dbSettings, dbType} from '../utils/Settings.js';

import log4js from 'log4js';

import stats from '../stats.js';

const logger = log4js.getLogger('ueberDB');

/**
 * The UeberDB Object that provides the database functions
 */
export let db = null;

/**
 * Initializes the database with the settings provided by the settings module
 */
export const init = async () => {
  db = new ueberDB.Database(dbType, dbSettings, null, logger);
  await db.init();
  if (db.metrics != null) {
    for (const [metric, value] of Object.entries(db.metrics)) {
      if (typeof value !== 'number') continue;
      stats.gauge(`ueberdb_${metric}`, () => db.metrics[metric]);
    }
  }
  for (const fn of ['get', 'set', 'findKeys', 'getSub', 'setSub', 'remove']) {
    const f = db[fn];
    global[fn] = async (...args) => await f.call(db, ...args);
    Object.setPrototypeOf(global[fn], Object.getPrototypeOf(f));
    Object.defineProperties(global[fn], Object.getOwnPropertyDescriptors(f));
  }
};

export const shutdown = async (hookName, context) => {
  if (db != null) await db.close();
  db = null;
  logger.log('Database closed');
};

export default db;
