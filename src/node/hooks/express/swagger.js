var express = require('express');
var apiHandler = require('../../handler/APIHandler');
var apiCaller = require('./apicalls').apiCaller;
var settings = require("../../utils/Settings");

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
      "description": "this functions helps you to map your application group ids to Etherpad group ids",
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
      "description": "this functions helps you to map your application author ids to Etherpad author ids",
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
    // We need an operation that return a UserInfo so it can be picked up by the codegen :(
    "getName" : {
      "func": "getAuthorName",
      "description": "Returns the Author Name of the author",
      "responseProcessor": function(response) {
        if (response.data) {
          response["info"] = {"name": response.data.authorName};
          delete response["data"];
        }
      },
      "response": {"info":{"type":"UserInfo"}}
    }
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
    // We need an operation that returns a SessionInfo so it can be picked up by the codegen :(
    "info": {
      "func": "getSessionInfo",
      "description": "returns informations about a session",
      "responseProcessor": function(response) {
        // move this to info
        if (response.data) {
          response["info"] = response.data;
          delete response["data"];
        }
      },
      "response": {"info":{"type":"SessionInfo"}}
    }
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
      "description": "creates a new (non-group) pad. Note that if you need to create a group Pad, you should call createGroupPad"
    },
    "getText" : {
      "func" : "getText",
      "description": "returns the text of a pad",
      "response": {"text":{"type":"string"}}
    },
    "setText" : {
      "func" : "setText",
      "description": "sets the text of a pad"
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
      "response": {"publicStatus":{"type":"boolean"}}
    },
    "setPassword": {
      "func": "setPassword",
      "description": "returns ok or a error message"
    },
    "isPasswordProtected": {
      "func": "isPasswordProtected",
      "description": "returns true or false",
      "response": {"passwordProtection":{"type":"boolean"}}
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
      "response": {"padUsers":{"type":"List", "items":{"type": "UserInfo"}}}
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
    // We need an operation that returns a Message so it can be picked up by the codegen :(
    "getChatHead": {
      "func": "getChatHead",
      "description": "returns the chatHead (chat-message) of the pad",
      "responseProcessor": function(response) {
        // move this to info
        if (response.data) {
          response["chatHead"] = {"time": response.data["chatHead"]};
          delete response["data"];
        }
      },
      "response": {"chatHead":{"type":"Message"}}
    }
  }
};

function capitalise(string){
  return string.charAt(0).toUpperCase() + string.slice(1);
}

for (var resource in API) {
  for (var func in API[resource]) {
    
    // The base response model
    var responseModel = {
      "properties": {
        "code":{
          "type":"int"
        },
        "message":{
          "type":"string"
        }
      }
    };

    var responseModelId = "Response";

    // Add the data properties (if any) to the response
    if (API[resource][func]["response"]) {
      // This is a specific response so let's set a new id
      responseModelId = capitalise(resource) + capitalise(func) + "Response";

      for(var prop in API[resource][func]["response"]) {
        var propType = API[resource][func]["response"][prop];
        responseModel["properties"][prop] = propType;
      }
    }

    // Add the id
    responseModel["id"] = responseModelId;

    // Add this to the swagger models
    swaggerModels['models'][responseModelId] = responseModel;

    // Store the response model id
    API[resource][func]["responseClass"] = responseModelId;

  }
}

function newSwagger() {
  var swagger_module = require.resolve("swagger-node-express");
  if (require.cache[swagger_module]) {
    // delete the child modules from cache
    require.cache[swagger_module].children.forEach(function(m)  {delete require.cache[m.id];});
    // delete the module from cache
    delete require.cache[swagger_module];
  }
  return require("swagger-node-express");
}

exports.expressCreateServer = function (hook_name, args, cb) {

  for (var version in apiHandler.version) {
    
    var swagger = newSwagger();
    var basePath = "/rest/" + version;

    // Let's put this under /rest for now
    var subpath = express();

    args.app.use(basePath, subpath);

    //hack!
    var swagger_temp = swagger
    swagger = swagger.createNew(subpath);
    swagger.params = swagger_temp.params
    swagger.queryParam = swagger_temp.queryParam
    swagger.pathParam = swagger_temp.pathParam
    swagger.bodyParam = swagger_temp.bodyParam
    swagger.formParam = swagger_temp.formParam
    swagger.headerParam = swagger_temp.headerParam
    swagger.error = swagger_temp.error
    //swagger.setAppHandler(subpath);

    swagger.addModels(swaggerModels);

    for (var resource in API) {

      for (var funcName in API[resource]) {
        var func = API[resource][funcName];

        // get the api function
        var apiFunc = apiHandler.version[version][func["func"]];

        // Skip this one if it does not exist in the version
        if(!apiFunc) {
          continue;
        }

        var swaggerFunc = {
          'spec': {
            "description" : func["description"],
            "path" : "/" + resource + "/" + funcName,
            "summary" : funcName,
            "nickname" : funcName,
            "method": "GET",
            "params" : apiFunc.map( function(param) {
              return swagger.queryParam(param, param, "string");
            }),
            "responseClass" : func["responseClass"]
          },
          'action': (function(func, responseProcessor) {
            return function (req,res) {
              req.params.version = version;
              req.params.func = func; // call the api function

              //wrap the send function so we can process the response
              res.__swagger_send = res.send;
              res.send = function (response) {
                // ugly but we need to get this as json
                response = JSON.parse(response);
                // process the response if needed
                if (responseProcessor) {
                  response = responseProcessor(response);
                }
                // Let's move everything out of "data"
                if (response.data) {
                  for(var prop in response.data) {
                    response[prop] = response.data[prop];
                    delete response.data;
                  }
                }
                response = JSON.stringify(response);
                res.__swagger_send(response);
              };

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
    
    swagger.configure("http://" + settings.ip + ":" + settings.port + basePath, version);
  }
};
