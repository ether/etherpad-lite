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

var CommonCode = require('../utils/common_code');
var ERR = require("async-stacktrace");
var fs = require("fs");
var api = require("../db/API");
var padManager = require("../db/PadManager");
var randomString = CommonCode.require('/pad_utils').randomString;

//ensure we have an apikey
var apikey = null;
try
{
  apikey = fs.readFileSync("../APIKEY.txt","utf8");
}
catch(e) 
{
  apikey = randomString(32);
  fs.writeFileSync("../APIKEY.txt",apikey,"utf8");
}

//a list of all functions
var functions = {
  "createGroup"               : [],
  "createGroupIfNotExistsFor"  : ["groupMapper"], 
  "deleteGroup"               : ["groupID"], 
  "listPads"                  : ["groupID"], 
  "createPad"                 : ["padID", "text"], 
  "createGroupPad"            : ["groupID", "padName", "text"],
  "createAuthor"              : ["name"], 
  "createAuthorIfNotExistsFor": ["authorMapper" , "name"], 
  "createSession"             : ["groupID", "authorID", "validUntil"], 
  "deleteSession"             : ["sessionID"], 
  "getSessionInfo"            : ["sessionID"], 
  "listSessionsOfGroup"       : ["groupID"], 
  "listSessionsOfAuthor"      : ["authorID"], 
  "getText"                   : ["padID", "rev"],
  "setText"                   : ["padID", "text"],
  "getHTML"                   : ["padID", "rev"],
  "setHTML"                   : ["padID", "html"],
  "getRevisionsCount"         : ["padID"], 
  "deletePad"                 : ["padID"], 
  "getReadOnlyID"             : ["padID"],
  "setPublicStatus"           : ["padID", "publicStatus"], 
  "getPublicStatus"           : ["padID"], 
  "setPassword"               : ["padID", "password"], 
  "isPasswordProtected"       : ["padID"]
};

/**
 * Handles a HTTP API call
 * @param functionName the name of the called function
 * @param fields the params of the called function
 * @req express request object
 * @res express response object
 */
exports.handle = function(functionName, fields, req, res)
{
  //check the api key!
  if(fields["apikey"] != apikey.trim())
  {
    res.send({code: 4, message: "no or wrong API Key", data: null});
    return;
  }
  
  //check if this is a valid function name
  var isKnownFunctionname = false;
  for(var knownFunctionname in functions)
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

  //sanitize any pad id's before continuing
  if(fields["padID"])
  {
    padManager.sanitizePadId(fields["padID"], function(padId)
    {
      fields["padID"] = padId;
      callAPI(functionName, fields, req, res);
    });
  }
  else if(fields["padName"])
  {
    padManager.sanitizePadId(fields["padName"], function(padId)
    {
      fields["padName"] = padId;
      callAPI(functionName, fields, req, res);
    });
  }
  else
  {
    callAPI(functionName, fields, req, res);
  }
}

//calls the api function
function callAPI(functionName, fields, req, res)
{
  //put the function parameters in an array
  var functionParams = [];
  for(var i=0;i<functions[functionName].length;i++)
  {
    functionParams.push(fields[functions[functionName][i]]);
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
