/**
 * The Session Manager provides functions to manage session in the database
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
var customError = require("../utils/customError");
var randomString = require("../utils/randomstring");
var async = require("async");


var SessionManager = function SessionManager(db, groupManager, authorManager) {
    this.db = db;
    this.groupManager = groupManager;
    this.authorManager = authorManager;
};

exports.SessionManager = SessionManager;

SessionManager.prototype.doesSessionExist = function(sessionID, callback)
{
  //check if the database entry of this session exists
  this.db.get("session:" + sessionID, function (err, session)
  {
    if(ERR(err, callback)) return;
    callback(null, session != null);
  });
};

/**
 * Creates a new session between an author and a group
 */
SessionManager.prototype.createSession = function(groupID, authorID, validUntil, callback)
{
  var sessionID;
  var that = this;

  async.series([
    //check if group exists
    function(callback)
    {
      that.groupMangager.doesGroupExist(groupID, function(err, exists)
      {
        if(ERR(err, callback)) return;

        //group does not exist
        if(exists == false)
        {
          callback(new customError("groupID does not exist","apierror"));
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
      that.authorMangager.doesAuthorExists(authorID, function(err, exists)
      {
        if(ERR(err, callback)) return;

        //author does not exist
        if(exists == false)
        {
          callback(new customError("authorID does not exist","apierror"));
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
          callback(new customError("validUntil is not a number","apierror"));
          return;
        }
      }

      //ensure this is not a negativ number
      if(validUntil < 0)
      {
        callback(new customError("validUntil is a negativ number","apierror"));
        return;
      }

      //ensure this is not a float value
      if(!is_int(validUntil))
      {
        callback(new customError("validUntil is a float value","apierror"));
        return;
      }

      //check if validUntil is in the future
      if(Math.floor(new Date().getTime()/1000) > validUntil)
      {
        callback(new customError("validUntil is in the past","apierror"));
        return;
      }

      //generate sessionID
      sessionID = "s." + randomString(16);

      //set the session into the database
      that.db.set("session:" + sessionID, {"groupID": groupID, "authorID": authorID, "validUntil": validUntil});

      callback();
    },
    //set the group2sessions entry
    function(callback)
    {
      //get the entry
      that.db.get("group2sessions:" + groupID, function(err, group2sessions)
      {
        if(ERR(err, callback)) return;

        //the entry doesn't exist so far, let's create it
        if(group2sessions == null)
        {
          group2sessions = {sessionIDs : {}};
        }

        //add the entry for this session
        group2sessions.sessionIDs[sessionID] = 1;

        //save the new element back
        that.db.set("group2sessions:" + groupID, group2sessions);

        callback();
      });
    },
    //set the author2sessions entry
    function(callback)
    {
      //get the entry
      that.db.get("author2sessions:" + authorID, function(err, author2sessions)
      {
        if(ERR(err, callback)) return;

        //the entry doesn't exist so far, let's create it
        if(author2sessions == null)
        {
          author2sessions = {sessionIDs : {}};
        }

        //add the entry for this session
        author2sessions.sessionIDs[sessionID] = 1;

        //save the new element back
        that.db.set("author2sessions:" + authorID, author2sessions);

        callback();
      });
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;

    //return error and sessionID
    callback(null, {sessionID: sessionID});
  })
}

SessionManager.prototype.getSessionInfo = function(sessionID, callback)
{
  //check if the database entry of this session exists
  this.db.get("session:" + sessionID, function (err, session)
  {
    if(ERR(err, callback)) return;

    //session does not exists
    if(session == null)
    {
      callback(new customError("sessionID does not exist","apierror"));
    }
    //everything is fine, return the sessioninfos
    else
    {
      callback(null, session);
    }
  });
};

/**
 * Deletes a session
 */
exports.deleteSession = function(sessionID, callback)
{
  var authorID, groupID;
  var group2sessions, author2sessions;
  var that = this;

  async.series([
    function(callback)
    {
      //get the session entry
      that.db.get("session:" + sessionID, function (err, session)
      {
        if(ERR(err, callback)) return;

        //session does not exists
        if(session == null)
        {
          callback(new customError("sessionID does not exist","apierror"))
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
      that.db.get("group2sessions:" + groupID, function (err, _group2sessions)
      {
        if(ERR(err, callback)) return;
        group2sessions = _group2sessions;
        callback();
      });
    },
    //get the author2sessions entry
    function(callback)
    {
      that.db.get("author2sessions:" + authorID, function (err, _author2sessions)
      {
        if(ERR(err, callback)) return;
        author2sessions = _author2sessions;
        callback();
      });
    },
    //remove the values from the database
    function(callback)
    {
      //remove the session
      that.db.remove("session:" + sessionID);

      //remove session from group2sessions
      delete group2sessions.sessionIDs[sessionID];
      that.db.set("group2sessions:" + groupID, group2sessions);

      //remove session from author2sessions
      delete author2sessions.sessionIDs[sessionID];
      that.db.set("author2sessions:" + authorID, author2sessions);

      callback();
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;
    callback();
  })
};

SessionManager.prototype.listSessionsOfGroup = function(groupID, callback)
{
    var that = this;
  this.groupMangager.doesGroupExist(groupID, function(err, exists)
  {
    if(ERR(err, callback)) return;

    //group does not exist
    if(exists == false)
    {
      callback(new customError("groupID does not exist","apierror"));
    }
    //everything is fine, continue
    else
    {
      that.listSessionsWithDBKey("group2sessions:" + groupID, callback);
    }
  });
};

SessionManager.prototype.listSessionsOfAuthor = function(authorID, callback)
{
  var that = this;
  this.authorMangager.doesAuthorExists(authorID, function(err, exists)
  {
    if(ERR(err, callback)) return;

    //group does not exist
    if(exists == false)
    {
      callback(new customError("authorID does not exist","apierror"));
    }
    //everything is fine, continue
    else
    {
      that.listSessionsWithDBKey("author2sessions:" + authorID, callback);
    }
  });
};

//this function is basicly the code listSessionsOfAuthor and listSessionsOfGroup has in common
SessionManager.prototype.listSessionsWithDBKey = function listSessionsWithDBKey (dbkey, callback)
{
  var sessions;
  var that = this;
  async.series([
    function(callback)
    {
      //get the group2sessions entry
      that.db.get(dbkey, function(err, sessionObject)
      {
        if(ERR(err, callback)) return;
        sessions = sessionObject ? sessionObject.sessionIDs : null;
        callback();
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
        that.getSessionInfo(sessionID, function(err, sessionInfo)
        {
          if(ERR(err, callback)) return;
          sessions[sessionID] = sessionInfo;
          callback();
        });
      }, callback);
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;
    callback(null, sessions);
  });
}

//checks if a number is an int
function is_int(value) {
  return (parseFloat(value) == parseInt(value, 10)) && !isNaN(value);
}
