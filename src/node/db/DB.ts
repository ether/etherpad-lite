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

import ueberDB from 'ueberdb2';
const settings = require('../utils/Settings');
import log4js from 'log4js';
import {measuredCollection} from '../stats';

const logger = log4js.getLogger('ueberDB');

/**
 * The UeberDB Object that provides the database functions
 */
let db: ueberDB.Database|null = null;

/**
 * Initializes the database with the settings provided by the settings module
 */
export const init = async () => {
  db = new ueberDB.Database(settings.dbType, settings.dbSettings, null, logger);
  await db.init();
  if (db.metrics != null) {
    for (const [metric, value] of Object.entries(db.metrics)) {
      if (typeof value !== 'number') continue;
      measuredCollection.gauge(`ueberdb_${metric}`, () => db!.metrics[metric]);
    }
  }
}

export const get = async (key: string) => {
  if (db == null) throw new Error('Database not initialized');
  return await db.get(key);
}

export const set = async (key: string, value: any) => {
  if (db == null) throw new Error('Database not initialized');
  return await db.set(key, value);
}

export const findKeys = async (key: string, notKey:string|null, callback?: Function) => {
  if (db == null) throw new Error('Database not initialized');
  // @ts-ignore
  return await db.findKeys(key, notKey, callback as any);
}

export const getSub = async (key: string, field: string[], callback?: Function) => {
  if (db == null) throw new Error('Database not initialized');
  // @ts-ignore
  return await db.getSub(key, field, callback as any);
}

export const setSub = async (key: string, field: string[], value: any, callback?: any, deprecated?: any) => {
  if (db == null) throw new Error('Database not initialized');
  // @ts-ignore
  return await db.setSub(key, field, value, callback, deprecated);
}

export const remove = async (key: string, callback?: null) => {
  if (db == null) throw new Error('Database not initialized');
  return await db.remove(key, callback);
}


export const shutdown = async (hookName: string, context:any) => {
  if (exports.db != null) await exports.db.close();
  exports.db = null;
  logger.log('Database closed');
};

