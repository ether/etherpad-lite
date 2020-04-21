/**
 * The DB Module provides a database initalized with the settings
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

var ueberDB = require("ueberdb2");
var settings = require("../utils/Settings");
var log4js = require('log4js');
const util = require("util");

// set database settings
let db = new ueberDB.database(settings.dbType, settings.dbSettings, null, log4js.getLogger("ueberDB"));

/**
 * The UeberDB Object that provides the database functions
 */
exports.db = null;

/**
 * Initalizes the database with the settings provided by the settings module
 * @param {Function} callback
 */
exports.init = function() {
  // initalize the database async
  return new Promise((resolve, reject) => {
    db.init(function(err) {
      if (err) {
        // there was an error while initializing the database, output it and stop
        console.error("ERROR: Problem while initalizing the database");
        console.error(err.stack ? err.stack : err);
        process.exit(1);
      }

      // everything ok, set up Promise-based methods
      ['get', 'set', 'findKeys', 'getSub', 'setSub', 'remove', 'doShutdown'].forEach(fn => {
        exports[fn] = util.promisify(db[fn].bind(db));
      });

      // set up wrappers for get and getSub that can't return "undefined"
      let get = exports.get;
      exports.get = async function(key) {
        let result = await get(key);
        return (result === undefined) ? null : result;
      };

      let getSub = exports.getSub;
      exports.getSub = async function(key, sub) {
        let result = await getSub(key, sub);
        return (result === undefined) ? null : result;
      };

      // exposed for those callers that need the underlying raw API
      exports.db = db;
      resolve();
    });
  });
}
