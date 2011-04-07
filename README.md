# Etherpad-Lite
What is Etherpad Lite?
Etherpad lite is a really-real time collaborative editor spawned from the Hell fire of Etherpad. 
We're reusing the well tested Etherpad easysync library to make it really realtime. Etherpad Lite 
is based on node.js what makes it much leigther and more stable than the original Etherpad. Our hope 
is that this will encourage more users to install a realtime collaborative editor. A smaller and well 
documented codebase makes it easier for developers to improve the code

# Why use Etherpad Lite?
* Tiny server hardware footprint
* Pure Javascript client and server side
* No nasty dependancies
* Simplfied interface 
* Easy to embed
* Well documented
* Better support for third party editors

# What isn't available YET when compared to Etherpad?
* Timeslider
* Import/Export
* Clear authorship colours
* Upload files
* View Saved revisions
* Chat
* Pad management
* User management
* Plugin framework

# Installation
1. download latest node.js version from <http://nodejs.org/> and build it with this instructions <https://github.com/joyent/node/wiki/Installation>
2. install npm [curl http://npmjs.org/install.sh | sh]
3. install socket.io [npm install socket.io]

# Start
1. cd bin
2. ./run.sh
3. Open your web browser and visit http://IPSERVER:9001

# Contribute
Look at the TODO list at <https://github.com/Pita/etherpad-lite/wiki/TODO>
You can get in touch via petermartischka-at-googlemail.com 
A mailinglist/irc channel will follow later

