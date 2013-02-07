/**
 * This is the Socket.IO Router. It routes the Messages between the 
 * components of the Server. The components are at the moment: pad and timeslider
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
var log4js = require('log4js');
var messageLogger = log4js.getLogger("message");
var securityManager = require("../db/SecurityManager");
var padManager = require("../db/PadManager");

/**
 * Saves all components
 * key is the component name
 * value is the component module
 */ 
var components = {};

var socket;
 
/**
 * adds a component
 */
exports.addComponent = function(moduleName, module)
{
  //save the component
  components[moduleName] = module;
  
  //give the module the socket
  module.setSocketIO(socket);
}

/**
 * sets the socket.io and adds event functions for routing
 */
exports.setSocketIO = function(_socket)
{
  //save this socket internaly
  socket = _socket;
  
  socket.sockets.on('connection', function(client)
  {
    var clientAuthorized = false;
    
    //wrap the original send function to log the messages
    client._send = client.send;
    client.send = function(message)
    {
      messageLogger.info("to " + client.id + ": " + stringifyWithoutPassword(message));
      client._send(message);
    }
  
    //tell all components about this connect
    for(var i in components)
    {
      components[i].handleConnect(client);
    }
      
    //try to handle the message of this client
    function handleMessage(message)
    {
      if(message.component && components[message.component])
      {
        //check if component is registered in the components array        
        if(components[message.component])
        {
          messageLogger.info("from " + client.id + ": " + stringifyWithoutPassword(message));
          components[message.component].handleMessage(client, message);
        }
      }
      else
      {
        messageLogger.error("Can't route the message:" + stringifyWithoutPassword(message));
      }
    }  
      
    client.on('message', function(message)
    {
      if(message.protocolVersion && message.protocolVersion != 2)
      {
        messageLogger.warn("Protocolversion header is not correct:" + stringifyWithoutPassword(message));
        return;
      }

      //client is authorized, everything ok
      if(clientAuthorized)
      {
        handleMessage(message);
      }
      //try to authorize the client
      else
      {
        //this message has everything to try an authorization
        if(message.padId !== undefined && message.sessionID !== undefined && message.token !== undefined && message.password !== undefined)
        {
          // FIXME: always use httponly session cookies
          var sessionID = null;
          if (padManager.isTeamPad(message.padID)) {
            sessionID = message.sessionid;
          } else {
            sessionID = client.handshake.sessionID;
          }
          securityManager.checkAccess (message.padId, sessionID, message.token, message.password, function(err, statusObject)
          {
            ERR(err);
            
            //access was granted, mark the client as authorized and handle the message
            if(statusObject.accessStatus == "grant")
            {
              clientAuthorized = true;
              handleMessage(message);
            }
            //no access, send the client a message that tell him why
            else
            {
              messageLogger.warn("Authentication try failed:" + stringifyWithoutPassword(message));
              client.json.send({accessStatus: statusObject.accessStatus});
            }
          });
        }
        //drop message
        else
        {
          messageLogger.warn("Dropped message cause of bad permissions:" + stringifyWithoutPassword(message));
        }
      }
    });

    client.on('disconnect', function()
    {
      //tell all components about this disconnect
      for(var i in components)
      {
        components[i].handleDisconnect(client);
      }
    });
  });
}

//returns a stringified representation of a message, removes the password
//this ensures there are no passwords in the log
function stringifyWithoutPassword(message)
{
  var newMessage = {};
  
  for(var i in message)
  {
    if(i == "password" && message[i] != null)
      newMessage["password"] = "xxx";
    else
      newMessage[i]=message[i];
  }
  
  return JSON.stringify(newMessage);
}
