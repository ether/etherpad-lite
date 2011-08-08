/**
 * This module provides all API functions
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

var padManager = require("./PadManager");
var padMessageHandler = require("../handler/PadMessageHandler");
var readOnlyManager = require("./ReadOnlyManager");
var groupManager = require("./GroupManager");
var async = require("async");

/**********************/
/**GROUP FUNCTIONS*****/
/**********************/

/**
createGroup() creates a new group 

Example returns:

{code: 0, message:"ok", data: {groupID: 5}}
*/
exports.createGroup = groupManager.createGroup;

/**
getMappedGroup4(groupMapper) this functions helps you to map your application group ids to etherpad lite group ids 

Example returns:

{code: 0, message:"ok", data: {groupID: 7}}
*/
exports.getMappedGroup4 = groupManager.getMappedGroup4;

/**
deleteGroup(groupID) deletes a group 

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"There is no group for this groupID", data: null}
*/
exports.deleteGroup = function(groupID, callback)
{

}

/**
listPads(groupID) returns all pads of this group

Example returns:

{code: 0, message:"ok", data: {padIDs : ["3$test", "3$test2"]}
{code: 1, message:"There is no group for this groupID", data: null}
*/
exports.listPads = groupManager.listPads;

/**
createGroupPad(groupID, padName [, text]) creates a new pad in this group 

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"pad does already exist", data: null}
{code: 1, message:"There is no group for this groupID", data: null}
*/
exports.createGroupPad = groupManager.createGroupPad;

/**********************/
/**AUTHOR FUNCTIONS****/
/**********************/


/**
createAuthor([name]) creates a new author 

Example returns:

{code: 0, message:"ok", data: {authorID: 5}}
*/
exports.createAuthor = function(name, callback)
{

}

/**
getMappedAuthor4(authorMapper [, name]) this functions helps you to map your application author ids to etherpad lite author ids 

Example returns:

{code: 0, message:"ok", data: {authorID: 5}}
*/
exports.getMappedAuthor4 = function(authorMapper ,name, callback)
{

}

/**********************/
/**SESSION FUNCTIONS***/
/**********************/

/**
createSession(groupID, authorID, validUntil) creates a new session 

Example returns:

{code: 0, message:"ok", data: {sessionID: 5}}
{code: 1, message:"groupID doesn't exist", data: null}
{code: 1, message:"authorID doesn't exist", data: null}
{code: 1, message:"validUntil is in the past", data: null}
*/
exports.createSession = function(groupID, authorID, validUntil, callback)
{

}

/**
deleteSession(sessionID) deletes a session 

Example returns:

{code: 1, message:"ok", data: null}
{code: 1, message:"sessionID does not exist", data: null}
*/
exports.deleteSession = function(sessionID, callback)
{

}

/**
getSessionInfo(sessionID) returns informations about a session 

Example returns:

{code: 0, message:"ok", data: {authorID: 5, groupID: 7, validUntil: 1312201246}}
{code: 1, message:"sessionID does not exist", data: null}
*/
exports.getSessionInfo = function(sessionID, callback)
{

}

/**
listSessionsOfGroup(groupID) returns all sessions of a group 

Example returns:

{code: 0, message:"ok", data: {32: {authorID: 5, groupID: 7, validUntil: 1312201246}, 53: {authorID: 3, groupID: 2, validUntil: 1312201216}}}
{code: 1, message:"groupID does not exist", data: null}
*/
exports.listSessionsOfGroup = function(groupID, callback)
{

}

/**
listSessionsOfAuthor(authorID) returns all sessions of an author 

Example returns:

{code: 0, message:"ok", data: {32: {authorID: 5, groupID: 7, validUntil: 1312201246}, 53: {authorID: 3, groupID: 2, validUntil: 1312201216}}}
{code: 1, message:"authorID does not exist", data: null}
*/
exports.listSessionsOfAuthor = function(authorID, callback)
{

}

/**
deleteAllSessionsOfGroup(groupID) deletes all sessions of a group 

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"groupID does not exist", data: null}
*/
exports.deleteAllSessionsOfGroup = function(groupID, callback)
{
  
}

/**
deleteAllSessionsOfAuthor(authorID) deletes all sessions of an author 

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"authorID does not exist", data: null}
*/
exports.deleteAllSessionsOfAuthor = function(authorID, callback)
{

}

/************************/
/**PAD CONTENT FUNCTIONS*/
/************************/

/**
getText(padID, [rev]) returns the text of a pad 

Example returns:

{code: 0, message:"ok", data: {text:"Welcome Text"}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getText = function(padID, rev, callback)
{
  //check if rev is set
  if(typeof rev == "function")
  {
    callback = rev;
    rev = undefined;
  }
  
  //check if rev is a number
  if(rev !== undefined && typeof rev != "number")
  {
    //try to parse the number
    if(!isNaN(parseInt(rev)))
    {
      rev = parseInt(rev);
    }
    else
    {
      callback({stop: "rev is not a number"});
      return;
    }
  }
  
  //ensure this is not a negativ number
  if(rev !== undefined && rev < 0)
  {
    callback({stop: "rev is a negativ number"});
    return;
  }
  
  //ensure this is not a float value
  if(rev !== undefined && !is_int(rev))
  {
    callback({stop: "rev is a float value"});
    return;
  }
  
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(err)
    {
      callback(err);
      return;
    }
    
    //the client asked for a special revision
    if(rev !== undefined)
    {
      //check if this is a valid revision
      if(rev > pad.getHeadRevisionNumber())
      {
        callback({stop: "rev is higher than the head revision of the pad"});
        return;
      }
      
      //get the text of this revision
      pad.getInternalRevisionAText(rev, function(err, atext)
      {
        if(!err)
        {
          data = {text: atext.text};
        }
        
        callback(err, data);
      })
    }
    //the client wants the latest text, lets return it to him
    else
    {
      callback(null, {"text": pad.text()});
    }
  });
}

/**
setText(padID, text) sets the text of a pad 

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"padID does not exist", data: null}
{code: 1, message:"text too long", data: null}
*/
exports.setText = function(padID, text, callback)
{    
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(err)
    {
      callback(err);
      return;
    }
    
    //set the text
    pad.setText(text);
    
    //update the clients on the pad
    padMessageHandler.updatePadClients(pad, callback);
  });
}

/*****************/
/**PAD FUNCTIONS */
/*****************/

/**
getRevisionsCount(padID) returns the number of revisions of this pad 

Example returns:

{code: 0, message:"ok", data: {revisions: 56}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getRevisionsCount = function(padID, callback)
{
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(err)
    {
      callback(err);
      return;
    }
    
    callback(null, {revisions: pad.getHeadRevisionNumber()});
  });
}

/**
createPad(padName [, text]) creates a new pad in this group 

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"pad does already exist", data: null}
*/
exports.createPad = function(padID, text, callback)
{  
  //ensure there is no $ in the padID
  if(padID.indexOf("$") != -1)
  {
    callback({stop: "createPad can't create group pads"});
    return;
  }
  
  //create pad
  getPadSafe(padID, false, text, function(err)
  {
    callback(err);
  });
}

/**
deletePad(padID) deletes a pad 

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"padID does not exist", data: null}
*/
exports.deletePad = function(padID, callback)
{
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(err)
    {
      callback(err);
      return;
    }
    
    
  });
}

/**
getReadOnlyLink(padID) returns the read only link of a pad 

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getReadOnlyID = function(padID, callback)
{
  //we don't need the pad object, but this function does all the security stuff for us
  getPadSafe(padID, true, function(err)
  {
    if(err)
    {
      callback(err);
      return;
    }
    
    //get the readonlyId
    readOnlyManager.getReadOnlyId(padID, function(err, readOnlyId)
    {
      callback(err, {readOnlyID: readOnlyId});
    });
  });
}

/**
setPublicStatus(padID, publicStatus) sets a boolean for the public status of a pad 

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"padID does not exist", data: null}
*/
exports.setPublicStatus = function(padID, publicStatus, callback)
{
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(err)
    {
      callback(err);
      return;
    }
    
    
  });
}

/**
getPublicStatus(padID) return true of false 

Example returns:

{code: 0, message:"ok", data: {publicStatus: true}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getPublicStatus = function(padID, callback)
{
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(err)
    {
      callback(err);
      return;
    }
    
    
  });
}

/**
setPassword(padID, password) returns ok or a error message 

Example returns:

{code: 0, message:"ok", data: null}
{code: 1, message:"padID does not exist", data: null}
*/
exports.setPassword = function(padID, password, callback)
{
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(err)
    {
      callback(err);
      return;
    }
    
    
  });
}

/**
isPasswordProtected(padID) returns true or false 

Example returns:

{code: 0, message:"ok", data: {passwordProtection: true}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.isPasswordProtected = function(padID, callback)
{
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(err)
    {
      callback(err);
      return;
    }
    
    
  });
}

/******************************/
/** INTERNAL HELPER FUNCTIONS */
/******************************/

//checks if a number is an int
function is_int(value)
{ 
  return (parseFloat(value) == parseInt(value)) && !isNaN(value)
}

//gets a pad safe
function getPadSafe(padID, shouldExist, text, callback)
{
  if(typeof text == "function")
  {
    callback = text;
    text = null;
  }

  //check if padID is a string
  if(typeof padID != "string")
  {
    callback({stop: "padID is not a string"});
    return;
  }
  
  //check if the padID maches the requirements
  if(!padManager.isValidPadId(padID))
  {
    callback({stop: "padID did not match requirements"});
    return;
  }
  
  //check if the pad exists
  padManager.doesPadExists(padID, function(err, exists)
  {
    //error
    if(err) 
    {
      callback(err);
    }
    //does not exist, but should
    else if(exists == false && shouldExist == true)
    {
      callback({stop: "padID does not exist"});
    }
    //does exists, but shouldn't
    else if(exists == true && shouldExist == false)
    {
      callback({stop: "padID does already exist"});
    }
    //pad exists, let's get it
    else
    {
      padManager.getPad(padID, text, callback);
    }
  });
}
