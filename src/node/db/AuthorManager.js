/**
 * The AuthorManager controlls all information about the Pad authors
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
var customError = require("../utils/customError");
var randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;

exports.getColorPalette = function(){
  return ["#ffc7c7", "#fff1c7", "#e3ffc7", "#c7ffd5", "#c7ffff", "#c7d5ff", "#e3c7ff", "#ffc7f1", "#ff8f8f", "#ffe38f", "#c7ff8f", "#8fffab", "#8fffff", "#8fabff", "#c78fff", "#ff8fe3", "#d97979", "#d9c179", "#a9d979", "#79d991", "#79d9d9", "#7991d9", "#a979d9", "#d979c1", "#d9a9a9", "#d9cda9", "#c1d9a9", "#a9d9b5", "#a9d9d9", "#a9b5d9", "#c1a9d9", "#d9a9cd", "#4c9c82", "#12d1ad", "#2d8e80", "#7485c3", "#a091c7", "#3185ab", "#6818b4", "#e6e76d", "#a42c64", "#f386e5", "#4ecc0c", "#c0c236", "#693224", "#b5de6a", "#9b88fd", "#358f9b", "#496d2f", "#e267fe", "#d23056", "#1a1a64", "#5aa335", "#d722bb", "#86dc6c", "#b5a714", "#955b6a", "#9f2985", "#4b81c8", "#3d6a5b", "#434e16", "#d16084", "#af6a0e", "#8c8bd8"];
};

/**
 * Checks if the author exists
 */
exports.doesAuthorExists = function (authorID, callback)
{
  //check if the database entry of this author exists
  db.get("globalAuthor:" + authorID, function (err, author)
  {
    if(ERR(err, callback)) return;
    callback(null, author != null);
  });
}

/**
 * Returns the AuthorID for a token. 
 * @param {String} token The token 
 * @param {Function} callback callback (err, author) 
 */
exports.getAuthor4Token = function (token, callback)
{
  mapAuthorWithDBKey("token2author", token, function(err, author)
  {
    if(ERR(err, callback)) return;
    //return only the sub value authorID
    callback(null, author ? author.authorID : author);
  });
}

/**
 * Returns the AuthorID for a mapper. 
 * @param {String} token The mapper
 * @param {String} name The name of the author (optional)
 * @param {Function} callback callback (err, author) 
 */
exports.createAuthorIfNotExistsFor = function (authorMapper, name, callback)
{
  mapAuthorWithDBKey("mapper2author", authorMapper, function(err, author)
  {
    if(ERR(err, callback)) return;
    
    //set the name of this author
    if(name)
      exports.setAuthorName(author.authorID, name);
      
    //return the authorID
    callback(null, author);
  });
}

/**
 * Returns the AuthorID for a mapper. We can map using a mapperkey,
 * so far this is token2author and mapper2author
 * @param {String} mapperkey The database key name for this mapper 
 * @param {String} mapper The mapper
 * @param {Function} callback callback (err, author) 
 */
function mapAuthorWithDBKey (mapperkey, mapper, callback)
{  
  //try to map to an author
  db.get(mapperkey + ":" + mapper, function (err, author)
  {
    if(ERR(err, callback)) return;
  
    //there is no author with this mapper, so create one
    if(author == null)
    {
      exports.createAuthor(null, function(err, author)
      {
        if(ERR(err, callback)) return;
        
        //create the token2author relation
        db.set(mapperkey + ":" + mapper, author.authorID);
        
        //return the author
        callback(null, author);
      });
    }
    //there is a author with this mapper
    else
    {
      //update the timestamp of this author
      db.setSub("globalAuthor:" + author, ["timestamp"], new Date().getTime());
      
      //return the author
      callback(null, {authorID: author});
    }
  });
}

/**
 * Internal function that creates the database entry for an author 
 * @param {String} name The name of the author 
 */
exports.createAuthor = function(name, callback)
{
  //create the new author name
  var author = "a." + randomString(16);
        
  //create the globalAuthors db entry
  var authorObj = {"colorId" : Math.floor(Math.random()*32), "name": name, "timestamp": new Date().getTime()};
        
  //set the global author db entry
  db.set("globalAuthor:" + author, authorObj);
  
  callback(null, {authorID: author});
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
 * @param {String} colorId The color id of the author
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
 * @param {String} name The name of the author
 * @param {Function} callback (optional)
 */
exports.setAuthorName = function (author, name, callback)
{
  db.setSub("globalAuthor:" + author, ["name"], name, callback);
}

/**
 * Returns an array of all pads this author contributed to
 * @param {String} author The id of the author
 * @param {Function} callback (optional)
 */
exports.listPadsOfAuthor = function (authorID, callback)
{
  /* There are two other places where this array is manipulated:
   * (1) When the author is added to a pad, the author object is also updated
   * (2) When a pad is deleted, each author of that pad is also updated
   */
  //get the globalAuthor
  db.get("globalAuthor:" + authorID, function(err, author)
  {
    if(ERR(err, callback)) return;

    //author does not exists
    if(author == null)
    {
      callback(new customError("authorID does not exist","apierror"))
    }
    //everything is fine, return the pad IDs
    else
    {     
      var pads = [];
      if(author.padIDs != null)
      {
        for (var padId in author.padIDs)
        {
          pads.push(padId);
        }
      }
      callback(null, {padIDs: pads});
    }
  });
}

/**
 * Adds a new pad to the list of contributions
 * @param {String} author The id of the author
 * @param {String} padID The id of the pad the author contributes to
 */
exports.addPad = function (authorID, padID)
{
  //get the entry
  db.get("globalAuthor:" + authorID, function(err, author)
  {
    if(ERR(err)) return;
    if(author == null) return;
    
    //the entry doesn't exist so far, let's create it
    if(author.padIDs == null)
    {
      author.padIDs = {};
    }
      
    //add the entry for this pad
    author.padIDs[padID] = 1;// anything, because value is not used
      
    //save the new element back
    db.set("globalAuthor:" + authorID, author);
  });
}

/**
 * Removes a pad from the list of contributions
 * @param {String} author The id of the author
 * @param {String} padID The id of the pad the author contributes to
 */
exports.removePad = function (authorID, padID)
{
  db.get("globalAuthor:" + authorID, function (err, author)
  {
    if(ERR(err)) return;
    if(author == null) return;
    
    if(author.padIDs != null)
    {
      //remove pad from author
      delete author.padIDs[padID];   
      db.set("globalAuthor:" + authorID, author);
    }
  });
}
