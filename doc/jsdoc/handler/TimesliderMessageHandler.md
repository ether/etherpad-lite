# handler/TimesliderMessag
`require("./handler/TimesliderMessageHandler");`

The MessageHandler handles all Messages that comes from Socket.IO and controls the sessions

## Functions

- - -
### handleConnect (client)
Handles the connection of a new user

* **client** the new client

- - -
### handleDisconnect (client)
Handles the disconnection of a user

* **client** the client that leaves

- - -
### handleMessage (client, message)
Handles a message from a user

* **client** the client that send this message
* **message** the message from the client

- - -
### setSocketIO (socket_io)
Saves the Socket class we need to send and recieve data from the client

* **socket_io** The Socket

