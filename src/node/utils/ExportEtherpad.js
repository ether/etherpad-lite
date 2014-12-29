/**
 * Copyright 2014 John McLear.
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
    db.findKeys("pad:"+padId+"*", null, function(err,records){
      if(!err){
        cb(err, records);
      }
    })
  },
  function(records, cb){
    var data = {};
    async.forEachSeries(Object.keys(records), function(key, r){
      db.get(records[key], function(err, entry){
        data[records[key]] = entry;
        r(null); // callback;
      });
    }, function(err){ 
      cb(err, data);
    })
  }], function(err, data){
    callback(null, data);
  });
}
