/**
 * Controls the security of pad access
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
var authorManager = require("./AuthorManager");
var padManager = require("./PadManager");
var sessionManager = require("./SessionManager");
var settings = require("../utils/Settings");
var log4js = require('log4js');
var authLogger = log4js.getLogger("auth");

/**
 * This function controlls the access to a pad, it checks if the user can access a pad.
 * @param padID the pad the user wants to access
 * @param sesssionID the session the user has (set via api)
 * @param token the token of the author (randomly generated at client side, used for public pads)
 * @param password the password the user has given to access this pad, can be null 
 * @param callback will be called with (err, {accessStatus: grant|deny|wrongPassword|needPassword, authorID: a.xxxxxx})
 */ 
exports.checkAccess = function (padID, sessionCookie, token, password, callback)
{ 
  var statusObject;
  
  if(!padID) {
    callback(null, {accessStatus: "deny"});
    return;
  }

  // a valid session is required (api-only mode)
  if(settings.requireSession)
  {
    // without sessionCookie, access is denied
    if(!sessionCookie)
    {
      callback(null, {accessStatus: "deny"});
      return;
    }
  }
  // a session is not required, so we'll check if it's a public pad
  else
  {
    // it's not a group pad, means we can grant access
    if(padID.indexOf("$") == -1)
    {
      //get author for this token
      authorManager.getAuthor4Token(token, function(err, author)
      {
        if(ERR(err, callback)) return;
        
        // assume user has access
        statusObject = {accessStatus: "grant", authorID: author};
        // user can't create pads
        if(settings.editOnly)
        {
          // check if pad exists
          padManager.doesPadExists(padID, function(err, exists)
          {
            if(ERR(err, callback)) return;
            
            // pad doesn't exist - user can't have access
            if(!exists) statusObject.accessStatus = "deny";
            // grant or deny access, with author of token
            callback(null, statusObject);
          });
        }
        // user may create new pads - no need to check anything
        else
        {
          // grant access, with author of token
          callback(null, statusObject);
        }
      });
      
      //don't continue
      return;
    }
  }
   
  var groupID = padID.split("$")[0];
  var padExists = false;
  var validSession = false;
  var sessionAuthor;
  var tokenAuthor;
  var isPublic;
  var isPasswordProtected;
  var passwordStatus = password == null ? "notGiven" : "wrong"; // notGiven, correct, wrong

  async.series([
    //get basic informations from the database 
    function(callback)
    {
      async.parallel([
        //does pad exists
        function(callback)
        {
          padManager.doesPadExists(padID, function(err, exists)
          {
            if(ERR(err, callback)) return;
            padExists = exists;
            callback();
          });
        },
        //get information about all sessions contained in this cookie
        function(callback)
        {
          if (!sessionCookie)
          {
            callback();
            return;
          }
          
          var sessionIDs = sessionCookie.split(',');
          async.forEach(sessionIDs, function(sessionID, callback)
          {
            sessionManager.getSessionInfo(sessionID, function(err, sessionInfo)
            {
              //skip session if it doesn't exist
              if(err && err.message == "sessionID does not exist")
              {
                authLogger.debug("Auth failed: unknown session");
                callback();
                return;
              }
              
              if(ERR(err, callback)) return;
              
              var now = Math.floor(new Date().getTime()/1000);
              
              //is it for this group?
              if(sessionInfo.groupID != groupID)
              {
                authLogger.debug("Auth failed: wrong group");
                callback();
                return;
              }
              
              //is validUntil still ok?
              if(sessionInfo.validUntil <= now)
              {
                authLogger.debug("Auth failed: validUntil");
                callback();
                return;
              }
              
              // There is a valid session
              validSession = true;
              sessionAuthor = sessionInfo.authorID;
              
              callback();
            });
          }, callback);
        },
        //get author for token
        function(callback)
        {
          //get author for this token
          authorManager.getAuthor4Token(token, function(err, author)
          {
            if(ERR(err, callback)) return;
            tokenAuthor = author;
            callback();
          });
        }
      ], callback);
    },
    //get more informations of this pad, if avaiable
    function(callback)
    {
      //skip this if the pad doesn't exists
      if(padExists == false) 
      {
        callback();
        return;
      }
      
      padManager.getPad(padID, function(err, pad)
      {
        if(ERR(err, callback)) return;
        
        //is it a public pad?
        isPublic = pad.getPublicStatus();
        
        //is it password protected?
        isPasswordProtected = pad.isPasswordProtected();
        
        //is password correct?
        if(isPasswordProtected && password && pad.isCorrectPassword(password))
        {
          passwordStatus = "correct";
        }
        
        callback();
      });
    },
    function(callback)
    {
      //- a valid session for this group is avaible AND pad exists
      if(validSession && padExists)
      {
        //- the pad is not password protected
        if(!isPasswordProtected)
        {
          //--> grant access
          statusObject = {accessStatus: "grant", authorID: sessionAuthor};
        }
        //- the setting to bypass password validation is set
        else if(settings.sessionNoPassword)
        {
          //--> grant access
          statusObject = {accessStatus: "grant", authorID: sessionAuthor};
        }
        //- the pad is password protected and password is correct
        else if(isPasswordProtected && passwordStatus == "correct")
        {
          //--> grant access
          statusObject = {accessStatus: "grant", authorID: sessionAuthor};
        }
        //- the pad is password protected but wrong password given
        else if(isPasswordProtected && passwordStatus == "wrong")
        {
          //--> deny access, ask for new password and tell them that the password is wrong
          statusObject = {accessStatus: "wrongPassword"};
        }
        //- the pad is password protected but no password given
        else if(isPasswordProtected && passwordStatus == "notGiven")
        {
          //--> ask for password
          statusObject = {accessStatus: "needPassword"};
        }
        else
        {
          throw new Error("Ops, something wrong happend");
        }
      } 
      //- a valid session for this group avaible but pad doesn't exists
      else if(validSession && !padExists)
      {
        //--> grant access
        statusObject = {accessStatus: "grant", authorID: sessionAuthor};
        //--> deny access if user isn't allowed to create the pad
        if(settings.editOnly)
        {
          authLogger.debug("Auth failed: valid session & pad does not exist");
          statusObject.accessStatus = "deny";
        }
      }
      // there is no valid session avaiable AND pad exists
      else if(!validSession && padExists)
      {
        //-- its public and not password protected
        if(isPublic && !isPasswordProtected)
        {
          //--> grant access, with author of token
          statusObject = {accessStatus: "grant", authorID: tokenAuthor};
        }
        //- its public and password protected and password is correct
        else if(isPublic && isPasswordProtected && passwordStatus == "correct")
        {
          //--> grant access, with author of token
          statusObject = {accessStatus: "grant", authorID: tokenAuthor};
        }
        //- its public and the pad is password protected but wrong password given 
        else if(isPublic && isPasswordProtected && passwordStatus == "wrong")
        {
          //--> deny access, ask for new password and tell them that the password is wrong
          statusObject = {accessStatus: "wrongPassword"};
        }
        //- its public and the pad is password protected but no password given
        else if(isPublic && isPasswordProtected && passwordStatus == "notGiven")
        {
          //--> ask for password
          statusObject = {accessStatus: "needPassword"};
        }
        //- its not public
        else if(!isPublic)
        {
          authLogger.debug("Auth failed: invalid session & pad is not public");
          //--> deny access
          statusObject = {accessStatus: "deny"};
        }
        else
        {
          throw new Error("Ops, something wrong happend");
        }
      }    
      // there is no valid session avaiable AND pad doesn't exists
      else
      {
         authLogger.debug("Auth failed: invalid session & pad does not exist");
         //--> deny access
         statusObject = {accessStatus: "deny"};
      }
      
      callback();
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;
    callback(null, statusObject);
  });
};
