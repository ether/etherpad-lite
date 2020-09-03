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

var log4js = require('log4js');
var messageLogger = log4js.getLogger("message");
var securityManager = require("../db/SecurityManager");
var readOnlyManager = require("../db/ReadOnlyManager");
var remoteAddress = require("../utils/RemoteAddress").remoteAddress;
var settings = require('../utils/Settings');

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
  // save the component
  components[moduleName] = module;

  // give the module the socket
  module.setSocketIO(socket);
}

/**
 * sets the socket.io and adds event functions for routing
 */
exports.setSocketIO = function(_socket) {
  // save this socket internaly
  socket = _socket;

  socket.sockets.on('connection', function(client)
  {
    // Broken: See http://stackoverflow.com/questions/4647348/send-message-to-specific-client-with-socket-io-and-node-js
    // Fixed by having a persistant object, ideally this would actually be in the database layer
    // TODO move to database layer
    if (settings.trustProxy && client.handshake.headers['x-forwarded-for'] !== undefined) {
      remoteAddress[client.id] = client.handshake.headers['x-forwarded-for'];
    } else {
      remoteAddress[client.id] = client.handshake.address;
    }

    // wrap the original send function to log the messages
    client._send = client.send;
    client.send = function(message) {
      messageLogger.debug("to " + client.id + ": " + stringifyWithoutPassword(message));
      client._send(message);
    }

    // tell all components about this connect
    for (let i in components) {
      components[i].handleConnect(client);
    }

    client.on('message', async function(message) {
      if (message.protocolVersion && message.protocolVersion != 2) {
        messageLogger.warn("Protocolversion header is not correct:" + stringifyWithoutPassword(message));
        return;
      }
      if (!message.component || !components[message.component]) {
        messageLogger.error("Can't route the message:" + stringifyWithoutPassword(message));
        return;
      }
      messageLogger.debug("from " + client.id + ": " + stringifyWithoutPassword(message));
      await components[message.component].handleMessage(client, message);
    });

    client.on('disconnect', function() {
      // tell all components about this disconnect
      for (let i in components) {
        components[i].handleDisconnect(client);
      }
    });
  });
}

// returns a stringified representation of a message, removes the password
// this ensures there are no passwords in the log
function stringifyWithoutPassword(message)
{
  let newMessage = Object.assign({}, message);

  if (newMessage.password != null) {
    newMessage.password = "xxx";
  }

  return JSON.stringify(newMessage);
}
