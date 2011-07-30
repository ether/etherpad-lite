# handler/Socket
`require("./handler/SocketIORouter");`

This is the Socket.IO Router. It routes the Messages between the 
components of the Server. The components are at the moment: pad and timeslider

## Functions

- - -
### addComponent (moduleName, module)
Saves all components
key is the component name
value is the component module

* **moduleName** *No description*
* **module** *No description*

- - -
### setSocketIO (_socket)
sets the socket.io and adds event functions for routing

* **_socket** *No description*

