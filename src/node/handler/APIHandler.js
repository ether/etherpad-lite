/**
 * The API Handler handles all API http requests
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
var fs = require("fs");
var api = require("../db/API");
var padManager = require("../db/PadManager");
var randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;

//ensure we have an apikey
var apikey = null;
try
{
  apikey = fs.readFileSync("./APIKEY.txt","utf8");
}
catch(e) 
{
  apikey = randomString(32);
  fs.writeFileSync("./APIKEY.txt",apikey,"utf8");
}

//a list of all functions
var version =
{ "1":
  { "createGroup"               : []
  , "createGroupIfNotExistsFor" : ["groupMapper"]
  , "deleteGroup"               : ["groupID"]
  , "listPads"                  : ["groupID"]
  , "createPad"                 : ["padID", "text"]
  , "createGroupPad"            : ["groupID", "padName", "text"]
  , "createAuthor"              : ["name"]
  , "createAuthorIfNotExistsFor": ["authorMapper" , "name"]
  , "listPadsOfAuthor"          : ["authorID"]
  , "createSession"             : ["groupID", "authorID", "validUntil"]
  , "deleteSession"             : ["sessionID"]
  , "getSessionInfo"            : ["sessionID"]
  , "listSessionsOfGroup"       : ["groupID"]
  , "listSessionsOfAuthor"      : ["authorID"]
  , "getText"                   : ["padID", "rev"]
  , "setText"                   : ["padID", "text"]
  , "getHTML"                   : ["padID", "rev"]
  , "setHTML"                   : ["padID", "html"]
  , "getRevisionsCount"         : ["padID"]
  , "getLastEdited"             : ["padID"]
  , "deletePad"                 : ["padID"]
  , "getReadOnlyID"             : ["padID"]
  , "setPublicStatus"           : ["padID", "publicStatus"]
  , "getPublicStatus"           : ["padID"]
  , "setPassword"               : ["padID", "password"]
  , "isPasswordProtected"       : ["padID"]
  , "listAuthorsOfPad"          : ["padID"]
  , "padUsersCount"             : ["padID"]
  }
, "1.1":
  { "createGroup"               : []
  , "createGroupIfNotExistsFor" : ["groupMapper"]
  , "deleteGroup"               : ["groupID"]
  , "listPads"                  : ["groupID"]
  , "createPad"                 : ["padID", "text"]
  , "createGroupPad"            : ["groupID", "padName", "text"]
  , "createAuthor"              : ["name"]
  , "createAuthorIfNotExistsFor": ["authorMapper" , "name"]
  , "listPadsOfAuthor"          : ["authorID"]
  , "createSession"             : ["groupID", "authorID", "validUntil"]
  , "deleteSession"             : ["sessionID"]
  , "getSessionInfo"            : ["sessionID"]
  , "listSessionsOfGroup"       : ["groupID"]
  , "listSessionsOfAuthor"      : ["authorID"]
  , "getText"                   : ["padID", "rev"]
  , "setText"                   : ["padID", "text"]
  , "getHTML"                   : ["padID", "rev"]
  , "setHTML"                   : ["padID", "html"]
  , "getRevisionsCount"         : ["padID"]
  , "getLastEdited"             : ["padID"]
  , "deletePad"                 : ["padID"]
  , "getReadOnlyID"             : ["padID"]
  , "setPublicStatus"           : ["padID", "publicStatus"]
  , "getPublicStatus"           : ["padID"]
  , "setPassword"               : ["padID", "password"]
  , "isPasswordProtected"       : ["padID"]
  , "listAuthorsOfPad"          : ["padID"]
  , "padUsersCount"             : ["padID"]
  , "getAuthorName"             : ["authorID"]
  , "padUsers"                  : ["padID"]
  , "sendClientsMessage"        : ["padID", "msg"]
  , "listAllGroups"             : []
  }
, "1.2":
  { "createGroup"               : []
  , "createGroupIfNotExistsFor" : ["groupMapper"]
  , "deleteGroup"               : ["groupID"]
  , "listPads"                  : ["groupID"]
  , "createPad"                 : ["padID", "text"]
  , "createGroupPad"            : ["groupID", "padName", "text"]
  , "createAuthor"              : ["name"]
  , "createAuthorIfNotExistsFor": ["authorMapper" , "name"]
  , "listPadsOfAuthor"          : ["authorID"]
  , "createSession"             : ["groupID", "authorID", "validUntil"]
  , "deleteSession"             : ["sessionID"]
  , "getSessionInfo"            : ["sessionID"]
  , "listSessionsOfGroup"       : ["groupID"]
  , "listSessionsOfAuthor"      : ["authorID"]
  , "getText"                   : ["padID", "rev"]
  , "setText"                   : ["padID", "text"]
  , "getHTML"                   : ["padID", "rev"]
  , "setHTML"                   : ["padID", "html"]
  , "getRevisionsCount"         : ["padID"]
  , "getLastEdited"             : ["padID"]
  , "deletePad"                 : ["padID"]
  , "getReadOnlyID"             : ["padID"]
  , "setPublicStatus"           : ["padID", "publicStatus"]
  , "getPublicStatus"           : ["padID"]
  , "setPassword"               : ["padID", "password"]
  , "isPasswordProtected"       : ["padID"]
  , "listAuthorsOfPad"          : ["padID"]
  , "padUsersCount"             : ["padID"]
  , "getAuthorName"             : ["authorID"]
  , "padUsers"                  : ["padID"]
  , "sendClientsMessage"        : ["padID", "msg"]
  , "listAllGroups"             : []
  , "checkToken"                : []
  }
, "1.2.1":
  { "createGroup"               : []
  , "createGroupIfNotExistsFor" : ["groupMapper"]
  , "deleteGroup"               : ["groupID"]
  , "listPads"                  : ["groupID"]
  , "listAllPads"               : []
  , "createPad"                 : ["padID", "text"]
  , "createGroupPad"            : ["groupID", "padName", "text"]
  , "createAuthor"              : ["name"]
  , "createAuthorIfNotExistsFor": ["authorMapper" , "name"]
  , "listPadsOfAuthor"          : ["authorID"]
  , "createSession"             : ["groupID", "authorID", "validUntil"]
  , "deleteSession"             : ["sessionID"]
  , "getSessionInfo"            : ["sessionID"]
  , "listSessionsOfGroup"       : ["groupID"]
  , "listSessionsOfAuthor"      : ["authorID"]
  , "getText"                   : ["padID", "rev"]
  , "setText"                   : ["padID", "text"]
  , "getHTML"                   : ["padID", "rev"]
  , "setHTML"                   : ["padID", "html"]
  , "getRevisionsCount"         : ["padID"]
  , "getLastEdited"             : ["padID"]
  , "deletePad"                 : ["padID"]
  , "getReadOnlyID"             : ["padID"]
  , "setPublicStatus"           : ["padID", "publicStatus"]
  , "getPublicStatus"           : ["padID"]
  , "setPassword"               : ["padID", "password"]
  , "isPasswordProtected"       : ["padID"]
  , "listAuthorsOfPad"          : ["padID"]
  , "padUsersCount"             : ["padID"]
  , "getAuthorName"             : ["authorID"]
  , "padUsers"                  : ["padID"]
  , "sendClientsMessage"        : ["padID", "msg"]
  , "listAllGroups"             : []
  , "checkToken"                : []
  }
, "1.2.7":
  { "createGroup"               : []
  , "createGroupIfNotExistsFor" : ["groupMapper"]
  , "deleteGroup"               : ["groupID"]
  , "listPads"                  : ["groupID"]
  , "listAllPads"               : []
  , "createDiffHTML"            : ["padID", "startRev", "endRev"]
  , "createPad"                 : ["padID", "text"]
  , "createGroupPad"            : ["groupID", "padName", "text"]
  , "createAuthor"              : ["name"]
  , "createAuthorIfNotExistsFor": ["authorMapper" , "name"]
  , "listPadsOfAuthor"          : ["authorID"]
  , "createSession"             : ["groupID", "authorID", "validUntil"]
  , "deleteSession"             : ["sessionID"]
  , "getSessionInfo"            : ["sessionID"]
  , "listSessionsOfGroup"       : ["groupID"]
  , "listSessionsOfAuthor"      : ["authorID"]
  , "getText"                   : ["padID", "rev"]
  , "setText"                   : ["padID", "text"]
  , "getHTML"                   : ["padID", "rev"]
  , "setHTML"                   : ["padID", "html"]
  , "getRevisionsCount"         : ["padID"]
  , "getLastEdited"             : ["padID"]
  , "deletePad"                 : ["padID"]
  , "getReadOnlyID"             : ["padID"]
  , "setPublicStatus"           : ["padID", "publicStatus"]
  , "getPublicStatus"           : ["padID"]
  , "setPassword"               : ["padID", "password"]
  , "isPasswordProtected"       : ["padID"]
  , "listAuthorsOfPad"          : ["padID"]
  , "padUsersCount"             : ["padID"]
  , "getAuthorName"             : ["authorID"]
  , "padUsers"                  : ["padID"]
  , "sendClientsMessage"        : ["padID", "msg"]
  , "listAllGroups"             : []
  , "checkToken"                : []
  , "getChatHistory"            : ["padID"]
  , "getChatHistory"            : ["padID", "start", "end"]
  , "getChatHead"               : ["padID"]
  }
, "1.2.8":
  { "createGroup"               : []
  , "createGroupIfNotExistsFor" : ["groupMapper"]
  , "deleteGroup"               : ["groupID"]
  , "listPads"                  : ["groupID"]
  , "listAllPads"               : []
  , "createDiffHTML"            : ["padID", "startRev", "endRev"]
  , "createPad"                 : ["padID", "text"]
  , "createGroupPad"            : ["groupID", "padName", "text"]
  , "createAuthor"              : ["name"]
  , "createAuthorIfNotExistsFor": ["authorMapper" , "name"]
  , "listPadsOfAuthor"          : ["authorID"]
  , "createSession"             : ["groupID", "authorID", "validUntil"]
  , "deleteSession"             : ["sessionID"]
  , "getSessionInfo"            : ["sessionID"]
  , "listSessionsOfGroup"       : ["groupID"]
  , "listSessionsOfAuthor"      : ["authorID"]
  , "getText"                   : ["padID", "rev"]
  , "setText"                   : ["padID", "text"]
  , "getHTML"                   : ["padID", "rev"]
  , "setHTML"                   : ["padID", "html"]
  , "getAttributePool"          : ["padID"]
  , "getRevisionsCount"         : ["padID"]
  , "getRevisionChangeset"      : ["padID", "rev"]
  , "getLastEdited"             : ["padID"]
  , "deletePad"                 : ["padID"]
  , "getReadOnlyID"             : ["padID"]
  , "setPublicStatus"           : ["padID", "publicStatus"]
  , "getPublicStatus"           : ["padID"]
  , "setPassword"               : ["padID", "password"]
  , "isPasswordProtected"       : ["padID"]
  , "listAuthorsOfPad"          : ["padID"]
  , "padUsersCount"             : ["padID"]
  , "getAuthorName"             : ["authorID"]
  , "padUsers"                  : ["padID"]
  , "sendClientsMessage"        : ["padID", "msg"]
  , "listAllGroups"             : []
  , "checkToken"                : []
  , "getChatHistory"            : ["padID"]
  , "getChatHistory"            : ["padID", "start", "end"]
  , "getChatHead"               : ["padID"]
  }
};

// set the latest available API version here
exports.latestApiVersion = '1.2.7';

// exports the versions so it can be used by the new Swagger endpoint
exports.version = version;

/**
 * Handles a HTTP API call
 * @param functionName the name of the called function
 * @param fields the params of the called function
 * @req express request object
 * @res express response object
 */
exports.handle = function(apiVersion, functionName, fields, req, res)
{
  //check if this is a valid apiversion
  var isKnownApiVersion = false;
  for(var knownApiVersion in version)
  {
    if(knownApiVersion == apiVersion)
    {
      isKnownApiVersion = true;
      break;
    }
  }
  
  //say goodbye if this is an unkown API version
  if(!isKnownApiVersion)
  {
    res.statusCode = 404;
    res.send({code: 3, message: "no such api version", data: null});
    return;
  }
  
  //check if this is a valid function name
  var isKnownFunctionname = false;
  for(var knownFunctionname in version[apiVersion])
  {
    if(knownFunctionname == functionName)
    {
      isKnownFunctionname = true;
      break;
    }
  }
  
  //say goodbye if this is a unkown function
  if(!isKnownFunctionname)
  {
    res.send({code: 3, message: "no such function", data: null});
    return;
  }
  
  //check the api key!
  fields["apikey"] = fields["apikey"] || fields["api_key"];
  
  if(fields["apikey"] != apikey.trim())
  {
    res.send({code: 4, message: "no or wrong API Key", data: null});
    return;
  }

  //sanitize any pad id's before continuing
  if(fields["padID"])
  {
    padManager.sanitizePadId(fields["padID"], function(padId)
    {
      fields["padID"] = padId;
      callAPI(apiVersion, functionName, fields, req, res);
    });
  }
  else if(fields["padName"])
  {
    padManager.sanitizePadId(fields["padName"], function(padId)
    {
      fields["padName"] = padId;
      callAPI(apiVersion, functionName, fields, req, res);
    });
  }
  else
  {
    callAPI(apiVersion, functionName, fields, req, res);
  }
}

//calls the api function
function callAPI(apiVersion, functionName, fields, req, res)
{
  //put the function parameters in an array
  var functionParams = [];
  for(var i=0;i<version[apiVersion][functionName].length;i++)
  {
    functionParams.push(fields[ version[apiVersion][functionName][i] ]);
  }
  
  //add a callback function to handle the response
  functionParams.push(function(err, data)
  {  
    // no error happend, everything is fine
    if(err == null)
    {
      if(!data)
        data = null;
    
      res.send({code: 0, message: "ok", data: data});
    }
    // parameters were wrong and the api stopped execution, pass the error
    else if(err.name == "apierror")
    {
      res.send({code: 1, message: err.message, data: null});
    }
    //an unkown error happend
    else
    {
      res.send({code: 2, message: "internal error", data: null});
      ERR(err);
    }
  });
  
  //call the api function
  api[functionName](functionParams[0],functionParams[1],functionParams[2],functionParams[3],functionParams[4]);
}
