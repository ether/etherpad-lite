'use strict';
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

const log4js = require('log4js');
const messageLogger = log4js.getLogger('message');
const stats = require('../stats');

/**
 * Saves all components
 * key is the component name
 * value is the component module
 */
const components = {};

let socket;

/**
 * adds a component
 */
exports.addComponent = (moduleName, module) => {
  // save the component
  components[moduleName] = module;

  // give the module the socket
  module.setSocketIO(socket);
};

/**
 * sets the socket.io and adds event functions for routing
 */
exports.setSocketIO = (_socket) => {
  // save this socket internaly
  socket = _socket;

  socket.sockets.on('connection', (client) => {
    // wrap the original send function to log the messages
    client._send = client.send;
    client.send = (message) => {
      messageLogger.debug(`to ${client.id}: ${JSON.stringify(message)}`);
      client._send(message);
    };

    // tell all components about this connect
    for (const i of Object.keys(components)) {
      components[i].handleConnect(client);
    }

    client.on('message', async (message) => {
      if (message.protocolVersion && message.protocolVersion !== 2) {
        messageLogger.warn(`Protocolversion header is not correct: ${JSON.stringify(message)}`);
        return;
      }
      if (!message.component || !components[message.component]) {
        messageLogger.error(`Can't route the message: ${JSON.stringify(message)}`);
        return;
      }
      messageLogger.debug(`from ${client.id}: ${JSON.stringify(message)}`);
      await components[message.component].handleMessage(client, message);
    });

    client.on('disconnect', () => {
      // store the lastDisconnect as a timestamp, this is useful if you want to know
      // when the last user disconnected.  If your activePads is 0 and totalUsers is 0
      // you can say, if there has been no active pads or active users for 10 minutes
      // this instance can be brought out of a scaling cluster.
      stats.gauge('lastDisconnect', () => Date.now());
      // tell all components about this disconnect
      for (const i of Object.keys(components)) {
        components[i].handleDisconnect(client);
      }
    });
  });
};
