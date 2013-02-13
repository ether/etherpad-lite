var log4js = require('log4js');
var express = require('express');
var swagger = require("swagger-node-express");
var apiHandler = require('../../handler/APIHandler');
var apiCaller = require('./apicalls').apiCaller;
var settings = require("../../utils/Settings");

var versions = Object.keys(apiHandler.version)
var version = versions[versions.length - 1];

var swaggerModels = {
  'models': {
    'SessionInfo' : {
      "id": 'SessionInfo',
      "properties": {
        "id": {
          "type": "string"
        },
        "authorID": {
          "type": "string"
        },
        "groupID":{
          "type":"string"
        },
        "validUntil":{
          "type":"long"
        }
      }
    },
    'UserInfo' : {
      "id": 'UserInfo',
      "properties": {
        "id": {
          "type": "string"
        },
        "colorId": {
          "type": "string"
        },
        "name":{
          "type":"string"
        },
        "timestamp":{
          "type":"long"
        }
      }
    },
    'Message' : {
      "id": 'Message',
      "properties": {
        "text": {
          "type": "string"
        },
        "userId": {
          "type": "string"
        },
        "userName":{
          "type":"string"
        },
        "time":{
          "type":"long"
        }
      }
    }
  }
};

function sessionListResponseProcessor(res) {
  if (res.data) {
    var sessions = [];
    for (var sessionId in res.data) {
      var sessionInfo = res.data[sessionId];
      sessionId["id"] = sessionId;
      sessions.push(sessionInfo);
    }
    res.data = sessions;
  }

  return res;
}

// We'll add some more info to the API methods
var API = {

  // Group
  "group": {
    "create" : { 
      "func" : "createGroup",
      "description": "creates a new group", 
      "response": {"groupID":{"type":"string"}}
    },
    "createIfNotExistsFor" : {
      "func": "createGroupIfNotExistsFor",
      "description": "this functions helps you to map your application group ids to etherpad lite group ids", 
      "response": {"groupID":{"type":"string"}}
    },
    "delete" : {
      "func": "deleteGroup",
      "description": "deletes a group"
    },
    "listPads" : {
      "func": "listPads", 
      "description": "returns all pads of this group", 
      "response": {"padIDs":{"type":"List", "items":{"type":"string"}}}
    },
    "createPad" : {
      "func": "createGroupPad", 
      "description": "creates a new pad in this group"
    },
    "listSessions": {
      "func": "listSessionsOfGroup",
      "responseProcessor": sessionListResponseProcessor,
      "description": "", 
      "response": {"sessions":{"type":"List", "items":{"type":"SessionInfo"}}}
    },
   "list": {
      "func": "listAllGroups",
      "description": "", 
      "response": {"groupIDs":{"type":"List", "items":{"type":"string"}}}
    },
  },
  
  // Author
  "author": {
    "create" : {
      "func" : "createAuthor", 
      "description": "creates a new author", 
      "response": {"authorID":{"type":"string"}}
    },
    "createIfNotExistsFor": {
      "func": "createAuthorIfNotExistsFor",
      "description": "this functions helps you to map your application author ids to etherpad lite author ids", 
      "response": {"authorID":{"type":"string"}}
    },
    "listPads": {
      "func": "listPadsOfAuthor",
      "description": "returns an array of all pads this author contributed to", 
      "response": {"padIDs":{"type":"List", "items":{"type":"string"}}}
    },
    "listSessions": {
      "func": "listSessionsOfAuthor",
      "responseProcessor": sessionListResponseProcessor,
      "description": "returns all sessions of an author", 
      "response": {"sessions":{"type":"List", "items":{"type":"SessionInfo"}}}
    },
    "getName" : {
      "func": "getAuthorName",
      "description": "Returns the Author Name of the author", 
      "response": {"authorName":{"type":"string"}}
    },
  },
  "session": {
    "create" : {
      "func": "createSession",
      "description": "creates a new session. validUntil is an unix timestamp in seconds", 
      "response": {"sessionID":{"type":"string"}}
    },
    "delete" : {
      "func": "deleteSession",
      "description": "deletes a session"
    },
    "info": {
      "func": "getSessionInfo", 
      "description": "returns informations about a session", 
      "response": {"authorID":{"type":"string"}, "groupID":{"type":"string"}, "validUntil":{"type":"long"}}
    },
  },
  "pad": {
    "listAll" : { 
      "func": "listAllPads", 
      "description": "list all the pads", 
      "response": {"padIDs":{"type":"List", "items": {"type" : "string"}}}
    },
    "createDiffHTML" : {
      "func" : "createDiffHTML", 
      "description": "", 
      "response": {}
    },
    "create" : { 
      "func" : "createPad",
      "description": "creates a new (non-group) pad. Note that if you need to create a group Pad, you should call createGroupPad", 
    },
    "getText" : {
      "func" : "getText",
      "description": "returns the text of a pad"
    },
    "setText" : {
      "func" : "setText",
      "description": "sets the text of a pad", 
      "response": {"groupID":{"type":"string"}}
    },
    "getHTML": {
      "func" : "getHTML",
      "description": "returns the text of a pad formatted as HTML", 
      "response": {"html":{"type":"string"}}
    },
    "setHTML": {
      "func" : "setHTML",
      "description": "sets the text of a pad with HTML"
    },
    "getRevisionsCount": {
      "func" : "getRevisionsCount",
      "description": "returns the number of revisions of this pad", 
      "response": {"revisions":{"type":"long"}}
    },
    "getLastEdited": {
      "func" : "getLastEdited",
      "description": "returns the timestamp of the last revision of the pad", 
      "response": {"lastEdited":{"type":"long"}}
    },
    "delete": {
      "func" : "deletePad",
      "description": "deletes a pad"
    },
    "getReadOnlyID": {
      "func" : "getReadOnlyID",
      "description": "returns the read only link of a pad", 
      "response": {"readOnlyID":{"type":"string"}}
    },
    "setPublicStatus": {
      "func": "setPublicStatus", 
      "description": "sets a boolean for the public status of a pad"
    },
    "getPublicStatus": {
      "func": "getPublicStatus",
      "description": "return true of false", 
      "response": {"publicStatus":{"type":"bool"}}
    },
    "setPassword": {
      "func": "setPassword",
      "description": "returns ok or a error message"
    },
    "isPasswordProtected": {
      "func": "isPasswordProtected", 
      "description": "returns true or false", 
      "response": {"passwordProtection":{"type":"bool"}}
    },
    "authors": {
      "func": "listAuthorsOfPad", 
      "description": "returns an array of authors who contributed to this pad", 
      "response": {"authorIDs":{"type":"List", "items":{"type" : "string"}}}
    },
    "usersCount": {
      "func": "padUsersCount", 
      "description": "returns the number of user that are currently editing this pad", 
      "response": {"padUsersCount":{"type": "long"}}
    },
    "users": {
      "func": "padUsers", 
      "description": "returns the list of users that are currently editing this pad", 
      "response": {"padUsers":{"type":"Lists", "items":{"type": "UserInfo"}}}
    },
    "sendClientsMessage": {
      "func": "sendClientsMessage", 
      "description": "sends a custom message of type msg to the pad"
    },
    "checkToken" : {
      "func": "checkToken",
      "description": "returns ok when the current api token is valid"
    },
    "getChatHistory": {
      "func": "getChatHistory", 
      "description": "returns the chat history", 
      "response": {"messages":{"type":"List", "items": {"type" : "Message"}}}
    },
    "getChatHead": {
      "func": "getChatHead", 
      "description": "returns the chatHead (last number of the last chat-message) of the pad", 
      "response": {"chatHead":{"type":"long"}}
    }
  }
};

function capitalise(string){
  return string.charAt(0).toUpperCase() + string.slice(1);
}

for (var resource in API) {
  for (var func in API[resource]) {
    
    // Add the response model
    var responseModelId = capitalise(resource) + capitalise(func) + "Response";
    
    swaggerModels['models'][responseModelId] = {
      "id": responseModelId,
      "properties": {
        "code":{
          "type":"int"
        },
        "message":{
          "type":"string"
        }
      }
    };

    // This returns some data
    if (API[resource][func]["response"]) {
      // Add the data model
      var dataModelId = capitalise(resource) + capitalise(func) + "Data";
      swaggerModels['models'][dataModelId] = {
        "id": dataModelId,
        "properties": API[resource][func]["response"]
      };

      swaggerModels['models'][responseModelId]["properties"]["data"] = {
        "type": dataModelId
      };
    }

    // Store the response model id
    API[resource][func]["responseClass"] = responseModelId;

    // get the api function
    var apiFunc = apiHandler.version[version][API[resource][func]["func"]];

    // Add the api function parameters
    API[resource][func]["params"] = apiFunc.map( function(param) {
      return swagger.queryParam(param, param, "string");
    });
  }
}

exports.expressCreateServer = function (hook_name, args, cb) {

  // Let's put this under /rest for now
  var subpath = express();

  args.app.use(express.bodyParser());
  args.app.use("/rest", subpath);

  swagger.setAppHandler(subpath);

  swagger.addModels(swaggerModels);

  for (var resource in API) {

    for (var funcName in API[resource]) {
      var func = API[resource][funcName];

      var swaggerFunc = {
        'spec': {
          "description" : func["description"],
          "path" : "/" + resource + "/" + funcName,
          "summary" : funcName,
          "nickname" : funcName,
          "method": "GET",
          "params" : func["params"],
          "responseClass" : func["responseClass"]
        },
        'action': (function(func, responseProcessor) { 
          return function (req,res) {
            req.params.version = version;
            req.params.func = func; // call the api function

            if (responseProcessor) {
              //wrap the send function so we can process the response
              res.__swagger_send = res.send;
              res.send = function (response) {
                response = responseProcessor(response);
                res.__swagger_send(response);
              }
            }
            apiCaller(req, res, req.query);
          };
        })(func["func"], func["responseProcessor"]) // must use a closure here
      };

      swagger.addGet(swaggerFunc);
    }
  }

  swagger.setHeaders = function setHeaders(res) {
    res.header('Access-Control-Allow-Origin', "*");
  };

  swagger.configureSwaggerPaths("", "/api" , "");
  
  swagger.configure("http://" + settings.ip + ":" + settings.port + "/rest", version);
}
