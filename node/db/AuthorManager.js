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
var async = require("async");

var randomString = require("../utils/randomstring");

var AuthorManager = function AuthorManager(db) {
    this.db = db;
};

exports.AuthorManager = AuthorManager;

/**
 * Checks if the author exists
 */
AuthorManager.prototype.doesAuthorExists = function (authorID, callback)
{
  //check if the database entry of this author exists
  this.db.get("globalAuthor:" + authorID, function (err, author)
  {
    if(ERR(err, callback)) return;
    callback(null, author != null);
  });
};

/**
 * Returns the AuthorID for a token.
 * @param {String} token The token
 * @param {Function} callback callback (err, author)
 */
AuthorManager.prototype.getAuthor4Token = function (token, callback)
{
  this.mapAuthorWithDBKey("token2author", token, function(err, author)
  {
    if(ERR(err, callback)) return;
    //return only the sub value authorID
    callback(null, author ? author.authorID : author);
  });
};

/**
 * Returns the AuthorID for a mapper.
 * @param {String} token The mapper
 * @param {Function} callback callback (err, author)
 */
AuthorManager.prototype.createAuthorIfNotExistsFor = function (authorMapper, name, callback)
{
  var that = this;
  this.mapAuthorWithDBKey("mapper2author", authorMapper, function(err, author)
  {
    if(ERR(err, callback)) return;

    //set the name of this author
    if(name)
      that.setAuthorName(author.authorID, name);

    //return the authorID
    callback(null, author);
  });
};

/**
 * Returns the AuthorID for a mapper. We can map using a mapperkey,
 * so far this is token2author and mapper2author
 * @param {String} mapperkey The database key name for this mapper
 * @param {String} mapper The mapper
 * @param {Function} callback callback (err, author)
 */
AuthorManager.prototype.mapAuthorWithDBKey = function mapAuthorWithDBKey (mapperkey, mapper, callback) {
  var that = this;
  //try to map to an author
  this.db.get(mapperkey + ":" + mapper, function (err, author)
  {
    if(ERR(err, callback)) return;

    //there is no author with this mapper, so create one
    if(author == null)
    {
      that.createAuthor(null, function(err, author) {
        if(ERR(err, callback)) return;

        //create the token2author relation
        that.db.set(mapperkey + ":" + mapper, author.authorID);

        //return the author
        callback(null, author);
      });
    }
    //there is a author with this mapper
    else {
      //update the timestamp of this author
      that.db.setSub("globalAuthor:" + author, ["timestamp"], new Date().getTime());

      //return the author
      callback(null, {authorID: author});
    }
  });
};

/**
 * Internal function that creates the database entry for an author
 * @param {String} name The name of the author
 */
AuthorManager.prototype.createAuthor = function(name, callback)
{
  //create the new author name
  var author = "a." + randomString(16);

  //create the globalAuthors db entry
  var authorObj = {"colorId" : Math.floor(Math.random()*32), "name": name, "timestamp": new Date().getTime()};

  //set the global author db entry
  this.db.set("globalAuthor:" + author, authorObj);

  callback(null, {authorID: author});
};

/**
 * Returns the Author Obj of the author
 * @param {String} author The id of the author
 * @param {Function} callback callback(err, authorObj)
 */
AuthorManager.prototype.getAuthor = function (author, callback)
{
  this.db.get("globalAuthor:" + author, callback);
};

/**
 * Returns the color Id of the author
 * @param {String} author The id of the author
 * @param {Function} callback callback(err, colorId)
 */
AuthorManager.prototype.getAuthorColorId = function (author, callback)
{
  this.db.getSub("globalAuthor:" + author, ["colorId"], callback);
};

/**
 * Sets the color Id of the author
 * @param {String} author The id of the author
 * @param {Function} callback (optional)
 */
AuthorManager.prototype.setAuthorColorId = function (author, colorId, callback)
{
  this.db.setSub("globalAuthor:" + author, ["colorId"], colorId, callback);
};

/**
 * Returns the name of the author
 * @param {String} author The id of the author
 * @param {Function} callback callback(err, name)
 */
AuthorManager.prototype.getAuthorName = function (author, callback)
{
  this.db.getSub("globalAuthor:" + author, ["name"], callback);
};

/**
 * Sets the name of the author
 * @param {String} author The id of the author
 * @param {Function} callback (optional)
 */
AuthorManager.prototype.setAuthorName = function (author, name, callback)
{
  this.db.setSub("globalAuthor:" + author, ["name"], name, callback);
};
