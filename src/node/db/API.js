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

var ERR = require("async-stacktrace");
var customError = require("../utils/customError");
var padManager = require("./PadManager");
var padMessageHandler = require("../handler/PadMessageHandler");
var readOnlyManager = require("./ReadOnlyManager");
var groupManager = require("./GroupManager");
var authorManager = require("./AuthorManager");
var sessionManager = require("./SessionManager");
var async = require("async");
var exportHtml = require("../utils/ExportHtml");
var importHtml = require("../utils/ImportHtml");
var cleanText = require("./Pad").cleanText;
var PadDiff = require("../utils/padDiff");

/**********************/
/**GROUP FUNCTIONS*****/
/**********************/

exports.listAllGroups = groupManager.listAllGroups;
exports.createGroup = groupManager.createGroup;
exports.createGroupIfNotExistsFor = groupManager.createGroupIfNotExistsFor;
exports.deleteGroup = groupManager.deleteGroup;
exports.listPads = groupManager.listPads;
exports.createGroupPad = groupManager.createGroupPad;

/**********************/
/**PADLIST FUNCTION****/
/**********************/

exports.listAllPads = padManager.listAllPads;

/**********************/
/**AUTHOR FUNCTIONS****/
/**********************/

exports.createAuthor = authorManager.createAuthor;
exports.createAuthorIfNotExistsFor = authorManager.createAuthorIfNotExistsFor;
exports.getAuthorName = authorManager.getAuthorName;
exports.listPadsOfAuthor = authorManager.listPadsOfAuthor;
exports.padUsers = padMessageHandler.padUsers;
exports.padUsersCount = padMessageHandler.padUsersCount;

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
getAttributePool(padID) returns the attribute pool of a pad

Example returns:
{
 "code":0,
 "message":"ok",
 "data": {
    "pool":{
        "numToAttrib":{
            "0":["author","a.X4m8bBWJBZJnWGSh"],
            "1":["author","a.TotfBPzov54ihMdH"],
            "2":["author","a.StiblqrzgeNTbK05"],
            "3":["bold","true"]
        },
        "attribToNum":{
            "author,a.X4m8bBWJBZJnWGSh":0,
            "author,a.TotfBPzov54ihMdH":1,
            "author,a.StiblqrzgeNTbK05":2,
            "bold,true":3
        },
        "nextNum":4
    }
 }
}

*/
exports.getAttributePool = function (padID, callback) 
{
  getPadSafe(padID, true, function(err, pad)
  {
    if (ERR(err, callback)) return;
    callback(null, {pool: pad.pool});
  });
}

/**
getRevisionChangeset (padID, [rev])

get the changeset at a given revision, or last revision if 'rev' is not defined.

Example returns:
{
    "code" : 0,
    "message" : "ok",
    "data" : "Z:1>6b|5+6b$Welcome to Etherpad!\n\nThis pad text is synchronized as you type, so that everyone viewing this page sees the same text. This allows you to collaborate seamlessly on documents!\n\nGet involved with Etherpad at http://etherpad.org\n"
}

*/
exports.getRevisionChangeset = function(padID, rev, callback)
{
  // check if rev is set
  if (typeof rev === "function")
  {
    callback = rev;
    rev = undefined;
  }

  // check if rev is a number
  if (rev !== undefined && typeof rev !== "number")
  {
    // try to parse the number
    if (!isNaN(parseInt(rev)))
    {
      rev = parseInt(rev);
    }
    else
    {
      callback(new customError("rev is not a number", "apierror"));
      return;
    }
  }

  // ensure this is not a negative number
  if (rev !== undefined && rev < 0)
  {
    callback(new customError("rev is not a negative number", "apierror"));
    return;
  }

  // ensure this is not a float value
  if (rev !== undefined && !is_int(rev))
  {
    callback(new customError("rev is a float value", "apierror"));
    return;
  }

  // get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(ERR(err, callback)) return;
    
    //the client asked for a special revision
    if(rev !== undefined)
    {
      //check if this is a valid revision
      if(rev > pad.getHeadRevisionNumber())
      {
        callback(new customError("rev is higher than the head revision of the pad","apierror"));
        return;
      }
      
      //get the changeset for this revision
      pad.getRevisionChangeset(rev, function(err, changeset)
      {
        if(ERR(err, callback)) return;
        
        callback(null, changeset);
      })
    }
    //the client wants the latest changeset, lets return it to him
    else
    {
      callback(null, {"changeset": pad.getRevisionChangeset(pad.getHeadRevisionNumber())});
    }
  });
}

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
      callback(new customError("rev is not a number", "apierror"));
      return;
    }
  }
  
  //ensure this is not a negativ number
  if(rev !== undefined && rev < 0)
  {
    callback(new customError("rev is a negativ number","apierror"));
    return;
  }
  
  //ensure this is not a float value
  if(rev !== undefined && !is_int(rev))
  {
    callback(new customError("rev is a float value","apierror"));
    return;
  }
  
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(ERR(err, callback)) return;
    
    //the client asked for a special revision
    if(rev !== undefined)
    {
      //check if this is a valid revision
      if(rev > pad.getHeadRevisionNumber())
      {
        callback(new customError("rev is higher than the head revision of the pad","apierror"));
        return;
      }
      
      //get the text of this revision
      pad.getInternalRevisionAText(rev, function(err, atext)
      {
        if(ERR(err, callback)) return;
        
        data = {text: atext.text};
        
        callback(null, data);
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
  //text is required
  if(typeof text != "string")
  {
    callback(new customError("text is no string","apierror"));
    return;
  }

  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(ERR(err, callback)) return;
    
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
      callback(new customError("rev is not a number","apierror"));
      return;
    }
  }

  if(rev !== undefined && rev < 0)
  {
     callback(new customError("rev is a negative number","apierror"));
     return;
  }

  if(rev !== undefined && !is_int(rev))
  {
    callback(new customError("rev is a float value","apierror"));
    return;
  }

  getPadSafe(padID, true, function(err, pad)
  {
    if(ERR(err, callback)) return;
    
    //the client asked for a special revision
    if(rev !== undefined)
    {
      //check if this is a valid revision
      if(rev > pad.getHeadRevisionNumber())
      {
        callback(new customError("rev is higher than the head revision of the pad","apierror"));
        return;
      }
     
      //get the html of this revision 
      exportHtml.getPadHTML(pad, rev, function(err, html)
      {
          if(ERR(err, callback)) return;
          data = {html: html};
          callback(null, data);
      });
    }
    //the client wants the latest text, lets return it to him
    else
    {
      exportHtml.getPadHTML(pad, undefined, function (err, html)
      {
        if(ERR(err, callback)) return;
        data = {html: html};
        callback(null, data);
      });
    }
  });
}

exports.setHTML = function(padID, html, callback)
{
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(ERR(err, callback)) return;

    // add a new changeset with the new html to the pad
    importHtml.setPadHTML(pad, cleanText(html));

    //update the clients on the pad
    padMessageHandler.updatePadClients(pad, callback);

  });
}

/******************/
/**CHAT FUNCTIONS */
/******************/

/**
getChatHistory(padId, start, end), returns a part of or the whole chat-history of this pad

Example returns:

{"code":0,"message":"ok","data":{"messages":[{"text":"foo","userId":"a.foo","time":1359199533759,"userName":"test"},
                                             {"text":"bar","userId":"a.foo","time":1359199534622,"userName":"test"}]}}

{code: 1, message:"start is higher or equal to the current chatHead", data: null}

{code: 1, message:"padID does not exist", data: null}
*/
exports.getChatHistory = function(padID, start, end, callback)
{
  if(start && end)
  {
    if(start < 0)
    {
      callback(new customError("start is below zero","apierror"));
      return;
    }
    if(end < 0)
    {
      callback(new customError("end is below zero","apierror"));
      return;
    }
    if(start > end)
    {
      callback(new customError("start is higher than end","apierror"));
      return;
    }
  }
  
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(ERR(err, callback)) return;
    var chatHead = pad.chatHead;
    
    // fall back to getting the whole chat-history if a parameter is missing
    if(!start || !end)
    {
	  start = 0;
	  end = pad.chatHead;
    }
    
    if(start >= chatHead && chatHead > 0)
    {
      callback(new customError("start is higher or equal to the current chatHead","apierror"));
      return;
    }
    if(end > chatHead)
    {
      callback(new customError("end is higher than the current chatHead","apierror"));
      return;
    }
    
    // the the whole message-log and return it to the client
    pad.getChatMessages(start, end,
      function(err, msgs)
      {
        if(ERR(err, callback)) return;
        callback(null, {messages: msgs});
      });
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
    if(ERR(err, callback)) return;
    
    callback(null, {revisions: pad.getHeadRevisionNumber()});
  });
}

/**
getLastEdited(padID) returns the timestamp of the last revision of the pad

Example returns:

{code: 0, message:"ok", data: {lastEdited: 1340815946602}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getLastEdited = function(padID, callback)
{
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(ERR(err, callback)) return;
    pad.getLastEdit(function(err, value) {
      if(ERR(err, callback)) return;
      callback(null, {lastEdited: value});
    });
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
  if(padID && padID.indexOf("$") != -1)
  {
    callback(new customError("createPad can't create group pads","apierror"));
    return;
  }
  
  //create pad
  getPadSafe(padID, false, text, function(err)
  {
    if(ERR(err, callback)) return;
    callback();
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
    if(ERR(err, callback)) return;
    
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
    if(ERR(err, callback)) return;
    
    //get the readonlyId
    readOnlyManager.getReadOnlyId(padID, function(err, readOnlyId)
    {
      if(ERR(err, callback)) return;
      callback(null, {readOnlyID: readOnlyId});
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
  if(padID && padID.indexOf("$") == -1)
  {
    callback(new customError("You can only get/set the publicStatus of pads that belong to a group","apierror"));
    return;
  }

  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(ERR(err, callback)) return;
    
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
  if(padID && padID.indexOf("$") == -1)
  {
    callback(new customError("You can only get/set the publicStatus of pads that belong to a group","apierror"));
    return;
  }
  
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(ERR(err, callback)) return;
    
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
  if(padID && padID.indexOf("$") == -1)
  {
    callback(new customError("You can only get/set the password of pads that belong to a group","apierror"));
    return;
  }
  
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(ERR(err, callback)) return;
    
    //set the password
    pad.setPassword(password == "" ? null : password);
    
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
  if(padID && padID.indexOf("$") == -1)
  {
    callback(new customError("You can only get/set the password of pads that belong to a group","apierror"));
    return;
  }

  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(ERR(err, callback)) return;
    
    callback(null, {isPasswordProtected: pad.isPasswordProtected()});
  });
}

/**
listAuthorsOfPad(padID) returns an array of authors who contributed to this pad 

Example returns:

{code: 0, message:"ok", data: {authorIDs : ["a.s8oes9dhwrvt0zif", "a.akf8finncvomlqva"]}
{code: 1, message:"padID does not exist", data: null}
*/
exports.listAuthorsOfPad = function(padID, callback)
{
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(ERR(err, callback)) return;
    
    callback(null, {authorIDs: pad.getAllAuthors()});
  });
}

/**
sendClientsMessage(padID, msg) sends a message to all clients connected to the
pad, possibly for the purpose of signalling a plugin.

Note, this will only accept strings from the HTTP API, so sending bogus changes
or chat messages will probably not be possible.

The resulting message will be structured like so:

{
  type: 'COLLABROOM',
  data: {
    type: <msg>,
    time: <time the message was sent>
  }
}

Example returns:

{code: 0, message:"ok"}
{code: 1, message:"padID does not exist"}
*/

exports.sendClientsMessage = function (padID, msg, callback) {
  getPadSafe(padID, true, function (err, pad) {
    if (ERR(err, callback)) {
      return;
    } else {
      padMessageHandler.handleCustomMessage(padID, msg, callback);
    }
  } );
}

/**
checkToken() returns ok when the current api token is valid

Example returns:

{"code":0,"message":"ok","data":null}
{"code":4,"message":"no or wrong API Key","data":null}
*/
exports.checkToken = function(callback)
{
  callback();
}

/**
getChatHead(padID) returns the chatHead (last number of the last chat-message) of the pad

Example returns:

{code: 0, message:"ok", data: {chatHead: 42}}
{code: 1, message:"padID does not exist", data: null}
*/
exports.getChatHead = function(padID, callback)
{
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(ERR(err, callback)) return;
    callback(null, {chatHead: pad.chatHead});
  });
}

/**
createDiffHTML(padID, startRev, endRev) returns an object of diffs from 2 points in a pad

Example returns:

{"code":0,"message":"ok","data":{"html":"<style>\n.authora_HKIv23mEbachFYfH {background-color: #a979d9}\n.authora_n4gEeMLsv1GivNeh {background-color: #a9b5d9}\n.removed {text-decoration: line-through; -ms-filter:'progid:DXImageTransform.Microsoft.Alpha(Opacity=80)'; filter: alpha(opacity=80); opacity: 0.8; }\n</style>Welcome to Etherpad!<br><br>This pad text is synchronized as you type, so that everyone viewing this page sees the same text. This allows you to collaborate seamlessly on documents!<br><br>Get involved with Etherpad at <a href=\"http&#x3a;&#x2F;&#x2F;etherpad&#x2e;org\">http:&#x2F;&#x2F;etherpad.org</a><br><span class=\"authora_HKIv23mEbachFYfH\">aw</span><br><br>","authors":["a.HKIv23mEbachFYfH",""]}}
{"code":4,"message":"no or wrong API Key","data":null}
*/
exports.createDiffHTML = function(padID, startRev, endRev, callback){
  //check if rev is a number
  if(startRev !== undefined && typeof startRev != "number")
  {
    //try to parse the number
    if(!isNaN(parseInt(startRev)))
    {
      startRev = parseInt(startRev, 10);
    }
    else
    {
      callback({stop: "startRev is not a number"});
      return;
    }
  }
 
  //check if rev is a number
  if(endRev !== undefined && typeof endRev != "number")
  {
    //try to parse the number
    if(!isNaN(parseInt(endRev)))
    {
      endRev = parseInt(endRev, 10);
    }
    else
    {
      callback({stop: "endRev is not a number"});
      return;
    }
  }
 
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(err){
      return callback(err);
    }
 
    try {
      var padDiff = new PadDiff(pad, startRev, endRev);
    } catch(e) {
      return callback({stop:e.message});
    }
    var html, authors;
 
    async.series([
      function(callback){
        padDiff.getHtml(function(err, _html){
          if(err){
            return callback(err);
          }
 
          html = _html;
          callback();
        });
      },
      function(callback){
        padDiff.getAuthors(function(err, _authors){
          if(err){
            return callback(err);
          }
 
          authors = _authors;
          callback();
        });
      }
    ], function(err){
      callback(err, {html: html, authors: authors})
    });
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
    callback(new customError("padID is not a string","apierror"));
    return;
  }
  
  //check if the padID maches the requirements
  if(!padManager.isValidPadId(padID))
  {
    callback(new customError("padID did not match requirements","apierror"));
    return;
  }
  
  //check if the pad exists
  padManager.doesPadExists(padID, function(err, exists)
  {
    if(ERR(err, callback)) return;
    
    //does not exist, but should
    if(exists == false && shouldExist == true)
    {
      callback(new customError("padID does not exist","apierror"));
    }
    //does exists, but shouldn't
    else if(exists == true && shouldExist == false)
    {
      callback(new customError("padID does already exist","apierror"));
    }
    //pad exists, let's get it
    else
    {
      padManager.getPad(padID, text, callback);
    }
  });
}
