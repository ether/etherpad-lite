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

var log4js = require('log4js');
var async = require("async");
var db = require("../db/DB").db;

exports.setPadRaw = function(padId, records, callback){
  records = JSON.parse(records);

  async.eachSeries(Object.keys(records), function(key, cb){
    var value = records[key]

    // Author data
    if(value.padIDs){
      // rewrite author pad ids
      value.padIDs[padId] = 1;
      var newKey = key;

      // Does this author already exist?
      db.get(key, function(err, author){
        if(author){
          // Yes, add the padID to the author..
          author.padIDs.push(padId);
          value = author;
        }else{
          // No, create a new array with the author info in
          value.padIDs = [padId];
        }
      });

    // Not author data, probably pad data
    }else{
      // we can split it to look to see if its pad data
      var oldPadId = key.split(":");

      // we know its pad data..
      if(oldPadId[0] === "pad"){

        // so set the new pad id for the author
        oldPadId[1] = padId;
        
        // and create the value
        var newKey = oldPadId.join(":"); // create the new key
      }

    }
    // Write the value to the server
    db.set(newKey, value);

    cb();
  }, function(){
    callback(null, true);
  });
}
