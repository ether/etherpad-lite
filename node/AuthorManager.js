/**
 * The AuthorManager controlls all information about the Pad authors
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

var db = require("./db").db;
var async = require("async");

/**
 * Returns the Author Id for a token. If the token is unkown, 
 * it creates a author for the token
 * @param {String} token The token 
 * @param {Function} callback callback (err, author) 
 * The callback function that is called when the result is here 
 */
exports.getAuthor4Token = function (token, callback)
{  
  var author;
  
  async.waterfall([
    //try to get the author for this token
    function(callback)
    {
      db.get("token2author:" + token, callback);
    },
    function(value, callback)
    {
      //there is no author with this token, so create one
      if(value == null)
      {
        //create the new author name
        author = "g." + _randomString(16);
        
        //set the token2author db entry
        db.set("token2author:" + token, author);
        
        //set the globalAuthors db entry
        var authorObj = {colorId : Math.floor(Math.random()*32), name: null, timestamp: new Date().getTime()};
        db.set("globalAuthor:" + author, authorObj); 
        
        callback(null);
      }
      //there is a author with this token
      else
      {
        author = value;
        
        //update the author time
        db.setSub("globalAuthor:" + author, ["timestamp"], new Date().getTime());

        callback(null);
      }
    }
  ], function(err)
  {
    callback(err, author);
  });
}

/**
 * Returns the Author Obj of the author
 * @param {String} author The id of the author
 * @param {Function} callback callback(err, authorObj)
 */
exports.getAuthor = function (author, callback)
{
  db.get("globalAuthor:" + author, callback);
}

/**
 * Returns the color Id of the author
 * @param {String} author The id of the author
 * @param {Function} callback callback(err, colorId)
 */
exports.getAuthorColorId = function (author, callback)
{
  db.getSub("globalAuthor:" + author, ["colorId"], callback);
}

/**
 * Sets the color Id of the author
 * @param {String} author The id of the author
 * @param {Function} callback (optional)
 */
exports.setAuthorColorId = function (author, colorId, callback)
{
  db.setSub("globalAuthor:" + author, ["colorId"], colorId, callback);
}

/**
 * Returns the name of the author
 * @param {String} author The id of the author
 * @param {Function} callback callback(err, name)
 */
exports.getAuthorName = function (author, callback)
{
  db.getSub("globalAuthor:" + author, ["name"], callback);
}

/**
 * Sets the name of the author
 * @param {String} author The id of the author
 * @param {Function} callback (optional)
 */
exports.setAuthorName = function (author, name, callback)
{
  db.setSub("globalAuthor:" + author, ["name"], name, callback);
}

/**
 * Generates a random String with the given length. Is needed to generate the Author Ids
 */
function _randomString(len) {
  // use only numbers and lowercase letters
  var pieces = [];
  for(var i=0;i<len;i++) {
    pieces.push(Math.floor(Math.random()*36).toString(36).slice(-1));
  }
  return pieces.join('');
}
