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

var ueberDB = require("ueberDB");
var log4js = require('log4js');

/**
 * Initalizes the database with the settings provided by the settings module
 * @param {Function} callback
 */
exports.init = function init(settings, callback) {
    //set database settings
    console.log(settings);
    var db = new ueberDB.database(settings.dbType, settings.dbSettings, null, log4js.getLogger("ueberDB"));
    
    //initalize the database async
    db.init(function(error){
    //there was an error while initializing the database, output it and stop
        if(error) {
            callback(error, null);
        }
        else {
            callback(null, db);
        }
    });
};
