/**
 * The ReadOnlyManager manages the database and rendering releated to read only pads
 */

/*
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

var db = require("./DB").db;
var async = require("async");

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
        readOnlyId = randomString(10);
        
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
    //return the results
    callback(err, readOnlyId);
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
 * Generates a random String with the given length. Is needed to generate the read only ids
 */
function randomString(len) 
{
  // use only numbers and lowercase letters
  var pieces = [];
  for(var i=0;i<len;i++) {
    pieces.push(Math.floor(Math.random()*36).toString(36).slice(-1));
  }
  return pieces.join('');
}
