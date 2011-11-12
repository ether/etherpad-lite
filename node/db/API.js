/**
 * This module provides all API functions
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

var padManager = require("./PadManager");
var padMessageHandler = require("../handler/PadMessageHandler");
var readOnlyManager = require("./ReadOnlyManager");
var groupManager = require("./GroupManager");
var authorManager = require("./AuthorManager");
var sessionManager = require("./SessionManager");
var async = require("async");
var exportHtml = require("../utils/ExportHtml");

/**********************/
/**GROUP FUNCTIONS*****/
/**********************/

exports.createGroup = groupManager.createGroup;
exports.createGroupIfNotExistsFor = groupManager.createGroupIfNotExistsFor;
exports.deleteGroup = groupManager.deleteGroup;
exports.listPads = groupManager.listPads;
exports.createGroupPad = groupManager.createGroupPad;

/**********************/
/**AUTHOR FUNCTIONS****/
/**********************/

exports.createAuthor = authorManager.createAuthor;
exports.createAuthorIfNotExistsFor = authorManager.createAuthorIfNotExistsFor;

/**********************/
/**SESSION FUNCTIONS***/
/**********************/

exports.createSession = sessionManager.createSession;
exports.deleteSession = sessionManager.deleteSession;
exports.getSessionInfo = sessionManager.getSessionInfo;
exports.listSessionsOfGroup = sessionManager.listSessionsOfGroup;
exports.listSessionsOfAuthor = sessionManager.listSessionsOfAuthor;

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

/**
getHTML(padID, [rev]) returns the html of a pad 

Example returns:

{code: 0, message:"ok", data: {text:"Welcome <strong>Text</strong>"}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getHTML = function(padID, rev, callback)
{
  if(typeof rev == "function")
  {
    callback = rev;
    rev = undefined; 
  }

  if (rev !== undefined && typeof rev != "number")
  {
    if (!isNaN(parseInt(rev)))
    {
      rev = parseInt(rev);
    }
    else
    {
      callback({stop: "rev is not a number"});
      return;
    }
  }

  if(rev !== undefined && rev < 0)
  {
     callback({stop: "rev is a negative number"});
     return;
  }

  if(rev !== undefined && !is_int(rev))
  {
    callback({stop: "rev is a float value"});
    return;
  }

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
     
      //get the html of this revision 
      exportHtml.getPadHTML(pad, rev, function(err, html)
      {
          if(!err)
          {
            data = {html: html};
          }
          callback(err, data);
      });
    }
    //the client wants the latest text, lets return it to him
    else
    {
      exportHtml.getPadHTML(pad, undefined, function (err, html)
      {
        if(!err)
        {
          data = {html: html};
        }
        callback(err, data);
      });
    }
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
  getPadSafe(padID, true, function(err, pad)
  {
    if(err)
    {
      callback(err);
      return;
    }
    
    pad.remove(callback);
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
  //ensure this is a group pad
  if(padID.indexOf("$") == -1)
  {
    callback({stop: "You can only get/set the publicStatus of pads that belong to a group"});
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
    
    //convert string to boolean
    if(typeof publicStatus == "string")
      publicStatus = publicStatus == "true" ? true : false;
    
    //set the password
    pad.setPublicStatus(publicStatus);
    
    callback();
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
  //ensure this is a group pad
  if(padID.indexOf("$") == -1)
  {
    callback({stop: "You can only get/set the publicStatus of pads that belong to a group"});
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
    
    callback(null, {publicStatus: pad.getPublicStatus()});
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
  //ensure this is a group pad
  if(padID.indexOf("$") == -1)
  {
    callback({stop: "You can only get/set the password of pads that belong to a group"});
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
    
    //set the password
    pad.setPassword(password);
    
    callback();
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
  //ensure this is a group pad
  if(padID.indexOf("$") == -1)
  {
    callback({stop: "You can only get/set the password of pads that belong to a group"});
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
    
    callback(null, {isPasswordProtected: pad.isPasswordProtected()});
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
