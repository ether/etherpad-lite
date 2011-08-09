/**
 * The Session Manager provides functions to manage session in the database
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
var groupMangager = require("./GroupManager");
var authorMangager = require("./AuthorManager");
 
exports.doesSessionExist = function(sessionID, callback)
{
  //check if the database entry of this session exists
  db.get("session:" + sessionID, function (err, session)
  {
    callback(err, session != null);
  });
}
 
/**
 * Creates a new session between an author and a group
 */
exports.createSession = function(groupID, authorID, validUntil, callback)
{
  var sessionID;

  async.series([
    //check if group exists
    function(callback)
    {
      groupMangager.doesGroupExist(groupID, function(err, exists)
      {
        //error
        if(err)
        {
          callback(err);
        }
        //group does not exist
        else if(exists == false)
        {
          callback({stop: "groupID does not exist"});
        }
        //everything is fine, continue
        else
        {
          callback();
        }
      });
    },
    //check if author exists
    function(callback)
    {
      authorMangager.doesAuthorExists(authorID, function(err, exists)
      {
        //error
        if(err)
        {
          callback(err);
        }
        //author does not exist
        else if(exists == false)
        {
          callback({stop: "authorID does not exist"});
        }
        //everything is fine, continue
        else
        {
          callback();
        }
      });
    },
    //check validUntil and create the session db entry
    function(callback)
    {
      //check if validUntil is a number
      if(typeof validUntil != "number")
      {
        //try to parse the number
        if(!isNaN(parseInt(validUntil)))
        {
          validUntil = parseInt(validUntil);
        }
        else
        {
          callback({stop: "validUntil is not a number"});
          return;
        }
      }
      
      //ensure this is not a negativ number
      if(validUntil < 0)
      {
        callback({stop: "validUntil is a negativ number"});
        return;
      }
      
      //ensure this is not a float value
      if(!is_int(validUntil))
      {
        callback({stop: "validUntil is a float value"});
        return;
      }
    
      //check if validUntil is in the future
      if(new Date().getTime()/1000 > validUntil)
      {
        callback({stop: "validUntil is in the past"});
        return;
      }
      
      //generate sessionID
      sessionID = "s." + randomString(16);
      
      //set the session into the database
      db.set("session:" + sessionID, {"groupID": groupID, "authorID": authorID, "validUntil": validUntil});
      
      callback();
    },
    //set the group2sessions entry
    function(callback)
    {
      //get the entry
      db.get("group2sessions:" + groupID, function(err, group2sessions)
      {
        //did a error happen?
        if(err)
        {
          callback(err);
          return;
        }
        
        //the entry doesn't exist so far, let's create it
        if(group2sessions == null)
        {
          group2sessions = {sessions : {}};
        }
        
        //add the entry for this session
        group2sessions.sessions[sessionID] = 1;
        
        callback();
      });
    },
    //set the author2sessions entry
    function(callback)
    {
      //get the entry
      db.get("author2sessions:" + authorID, function(err, author2sessions)
      {
        //did a error happen?
        if(err)
        {
          callback(err);
          return;
        }
        
        //the entry doesn't exist so far, let's create it
        if(author2sessions == null)
        {
          author2sessions = {sessions : {}};
        }
        
        //add the entry for this session
        author2sessions.sessions[sessionID] = 1;
        
        callback();
      });
    }
  ], function(err)
  {
    //return error and sessionID
    callback(err, {sessionID: sessionID});
  })
}

exports.getSessionInfo = function(sessionID, callback)
{
  //check if the database entry of this session exists
  db.get("session:" + sessionID, function (err, session)
  {
    //error
    if(err)
    {
      callback(err);
    }
    //session does not exists
    else if(session == null)
    {
      callback({stop: "sessionID does not exist"})
    }
    //everything is fine, return the sessioninfos
    else
    {
      callback(null, session);
    }
  });
}

/**
 * Deletes a session
 */
exports.deleteSession = function(sessionID, callback)
{
  //check if session exits
  //delete session
  //delete group2sessions
  //delete author2sessions
}

/**
returns all sessions of a group 

Example returns:

{code: 0, message:"ok", data: {32: {authorID: 5, groupID: 7, validUntil: 1312201246}, 53: {authorID: 3, groupID: 2, validUntil: 1312201216}}}
{code: 1, message:"groupID does not exist", data: null}
*/
exports.listSessionsOfGroup = function(groupID, callback)
{
  //check if group exists
  //get the group2sessions entry
}

/**
listSessionsOfAuthor(authorID) returns all sessions of an author 

Example returns:

{code: 0, message:"ok", data: {32: {authorID: 5, groupID: 7, validUntil: 1312201246}, 53: {authorID: 3, groupID: 2, validUntil: 1312201216}}}
{code: 1, message:"authorID does not exist", data: null}
*/
exports.listSessionsOfAuthor = function(authorID, callback)
{
  //check if author exists
  //get the author2sessions entry
}

/**
deleteAllSessionsOfGroup(groupID) deletes all sessions of a group 

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"groupID does not exist", data: null}
*/
exports.deleteAllSessionsOfGroup = function(groupID, callback)
{
  //call listsessionsofgroup
  //foreach the group and delete the sessions
}

/**
deleteAllSessionsOfAuthor(authorID) deletes all sessions of an author 

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"authorID does not exist", data: null}
*/
exports.deleteAllSessionsOfAuthor = function(authorID, callback)
{
  //call listsessionsofauthor
  //foreach the group and delete the sessions
}

/**
 * Generates a random String with the given length. Is needed to generate the SessionIDs
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

//checks if a number is an int
function is_int(value)
{ 
  return (parseFloat(value) == parseInt(value)) && !isNaN(value)
}
