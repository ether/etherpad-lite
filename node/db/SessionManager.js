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
      //check if rev is a number
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
      if(Math.floor(new Date().getTime()/1000) > validUntil)
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
          group2sessions = {sessionIDs : {}};
        }
        
        //add the entry for this session
        group2sessions.sessionIDs[sessionID] = 1;
        
        //save the new element back
        db.set("group2sessions:" + groupID, group2sessions);
        
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
          author2sessions = {sessionIDs : {}};
        }
        
        //add the entry for this session
        author2sessions.sessionIDs[sessionID] = 1;
        
        //save the new element back
        db.set("author2sessions:" + authorID, author2sessions);
        
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
  var authorID, groupID;
  var group2sessions, author2sessions;

  async.series([
    function(callback)
    {
      //get the session entry
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
          authorID = session.authorID;
          groupID = session.groupID;
          
          callback();
        }
      });
    },
    //get the group2sessions entry
    function(callback)
    {
      db.get("group2sessions:" + groupID, function (err, _group2sessions)
      {
        group2sessions = _group2sessions;
        callback(err);
      });
    },
    //get the author2sessions entry
    function(callback)
    {
      db.get("author2sessions:" + authorID, function (err, _author2sessions)
      {
        author2sessions = _author2sessions;
        callback(err);
      });
    },
    //remove the values from the database
    function(callback)
    {
      //remove the session
      db.remove("session:" + sessionID);
      
      //remove session from group2sessions
      delete group2sessions.sessionIDs[sessionID];
      db.set("group2sessions:" + groupID, group2sessions);
      
      //remove session from author2sessions
      delete author2sessions.sessionIDs[sessionID];
      db.set("author2sessions:" + authorID, author2sessions);
      
      callback();
    }
  ], function(err)
  {
    callback(err);
  })
}

exports.listSessionsOfGroup = function(groupID, callback)
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
      listSessionsWithDBKey("group2sessions:" + groupID, callback);
    }
  });
}

exports.listSessionsOfAuthor = function(authorID, callback)
{  
  authorMangager.doesAuthorExists(authorID, function(err, exists)
  {
    //error
    if(err)
    {
      callback(err);
    }
    //group does not exist
    else if(exists == false)
    {
      callback({stop: "authorID does not exist"});
    }
    //everything is fine, continue
    else
    {
      listSessionsWithDBKey("author2sessions:" + authorID, callback);
    }
  });
}

//this function is basicly the code listSessionsOfAuthor and listSessionsOfGroup has in common
function listSessionsWithDBKey (dbkey, callback)
{
  var sessions;

  async.series([
    function(callback)
    {
      //get the group2sessions entry
      db.get(dbkey, function(err, sessionObject)
      {
        sessions = sessionObject ? sessionObject.sessionIDs : null;
        callback(err);
      });
    },
    function(callback)
    {           
      //collect all sessionIDs in an arrary
      var sessionIDs = [];
      for (var i in sessions)
      {
        sessionIDs.push(i);
      }
      
      //foreach trough the sessions and get the sessioninfos
      async.forEach(sessionIDs, function(sessionID, callback)
      {
        exports.getSessionInfo(sessionID, function(err, sessionInfo)
        {
          sessions[sessionID] = sessionInfo;
          callback(err);
        });
      }, callback);
    }
  ], function(err)
  {
    callback(err, sessions);
  });
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
