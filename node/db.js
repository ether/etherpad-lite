/**
 * 2011 Peter 'Pita' Martischka
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
var settings = require("./settings");

//set database settings
var db = new ueberDB.database(settings.dbType, settings.dbSettings);

//set the exported db to null, we will set it in intalize
exports.db = null;

exports.init = function(callback)
{
  //initalize the database async
  db.init(function(err)
  {
    //there was an error while initializing the database, output it and stop 
    if(err)
    {
      console.error("ERROR: Problem while initalizing the database");
      console.error(err.stack ? err.stack : err);
      process.exit(1);
    }
    //everything ok
    else
    {
      exports.db = db;  
      callback(null);
    }
  });
}
