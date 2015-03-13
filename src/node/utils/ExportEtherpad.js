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


var async = require("async");
var db = require("../db/DB").db;
var ERR = require("async-stacktrace");

exports.getPadRaw = function(padId, callback){
  async.waterfall([
  function(cb){

    // Get the Pad
    db.findKeys("pad:"+padId, null, function(err,padcontent){
      if(!err){
        cb(err, padcontent);
      }
    })
  },
  function(padcontent,cb){

    // Get the Pad available content keys
    db.findKeys("pad:"+padId+":*", null, function(err,records){
      if(!err){
        for (var key in padcontent) { records.push(padcontent[key]);}
        cb(err, records);
      }
    })
  },
  function(records, cb){
    var data = {};

    async.forEachSeries(Object.keys(records), function(key, r){

      // For each piece of info about a pad.
      db.get(records[key], function(err, entry){
        data[records[key]] = entry;

        // Get the Pad Authors
        if(entry.pool && entry.pool.numToAttrib){
          var authors = entry.pool.numToAttrib;
          async.forEachSeries(Object.keys(authors), function(k, c){
            if(authors[k][0] === "author"){
              var authorId = authors[k][1];

              // Get the author info
              db.get("globalAuthor:"+authorId, function(e, authorEntry){
                if(authorEntry && authorEntry.padIDs) authorEntry.padIDs = padId;
                if(!e) data["globalAuthor:"+authorId] = authorEntry;
              });

            }
            // console.log("authorsK", authors[k]);
            c(null);
          });
        }
        r(null); // callback;
      });
    }, function(err){ 
      cb(err, data);
    })
  }
  ], function(err, data){
    callback(null, data);
  });
}
