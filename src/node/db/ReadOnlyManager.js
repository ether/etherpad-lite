/**
 * The ReadOnlyManager manages the database and rendering releated to read only pads
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


var ERR = require("async-stacktrace");
var db = require("./DB").db;
var async = require("async");
var randomString = require("../utils/randomstring");

/**
 * returns a read only id for a pad
 * @param {String} padId the id of the pad
 */
exports.getReadOnlyId = function (padId, callback)
{  
  var readOnlyId;
  
  async.waterfall([
    //check if there is a pad2readonly entry
    function(callback)
    {
      db.get("pad2readonly:" + padId, callback);
    },
    function(dbReadOnlyId, callback)
    {
      //there is no readOnly Entry in the database, let's create one
      if(dbReadOnlyId == null)
      {
        readOnlyId = "r." + randomString(16);
        
        db.set("pad2readonly:" + padId, readOnlyId);
        db.set("readonly2pad:" + readOnlyId, padId);
      }
      //there is a readOnly Entry in the database, let's take this one
      else
      {
        readOnlyId = dbReadOnlyId;
      }
      
      callback();
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;
    //return the results
    callback(null, readOnlyId);
  })
}

/**
 * returns a the padId for a read only id
 * @param {String} readOnlyId read only id
 */
exports.getPadId = function(readOnlyId, callback)
{
  db.get("readonly2pad:" + readOnlyId, callback);
}

/**
 * returns a the padId and readonlyPadId in an object for any id
 * @param {String} padIdOrReadonlyPadId read only id or real pad id
 */
exports.getIds = function(id, callback) {
  if (id.indexOf("r.") == 0)
    exports.getPadId(id, function (err, value) {
      if(ERR(err, callback)) return;
      callback(null, {
        readOnlyPadId: id,
        padId: value, // Might be null, if this is an unknown read-only id
        readonly: true
      });
    });
  else
    exports.getReadOnlyId(id, function (err, value) {
      callback(null, {
        readOnlyPadId: value,
        padId: id,
        readonly: false
      });
    });
}
