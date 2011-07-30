# handler/PadMessag
`require("./handler/PadMessageHandler");`

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
A associative array that translates a session to a pad

* **socket_io** The Socket

- - -
### updatePadClients (pad, callback)

* **pad** *No description*
* **callback** *No description*

