/**
 * This is the Socket.IO Router. It routes the Messages between the 
 * components of the Server. The components are at the moment: pad and timeslider
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
    //tell all components about this connect
    for(var i in components)
    {
      components[i].handleConnect(client);
    }
      
    client.on('message', function(message)
    {
      //route this message to the correct component, if possible
      if(message.component && components[message.component])
      {
        console.error(message);

        //check if component is registered in the components array        
        if(components[message.component])
        {
          components[message.component].handleMessage(client, message);
        }
      }
      else
      {
        throw "Can't route the message:" + JSON.stringify(message);
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
