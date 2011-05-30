# server
`require("./server");`

This module is started with bin/run.sh. It sets up a Express HTTP and a Socket.IO Server. 
Static file Requests are answered directly from this module, Socket.IO messages are passed 
to MessageHandler and minfied requests are passed to minified.

##Variables

- - -
### maxAge 


