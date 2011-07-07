# About
Etherpad lite is a really-real time collaborative editor spawned from the Hell fire of Etherpad. 
We're reusing the well tested Etherpad easysync library to make it really realtime. Etherpad Lite 
is based on node.js what makes it much leigther and more stable than the original Etherpad. Our hope 
is that this will encourage more users to install a realtime collaborative editor. A smaller and well 
documented codebase makes it easier for developers to improve the code. Etherpad Lite is optimized 
to be easy embeddable

**Online demo**<br>
Visit <http://pitapoison.de:9001> to test it live

# Etherpad vs Etherpad Lite
<table>
  <tr>
    <td>&nbsp;</td><td><b>Etherpad</b></td><td><b>Etherpad Lite</b></td>
  </tr>
  <tr>
    <td align="right">Size of the folder (without git history)</td><td>30 MB</td><td>1.5 MB</td>
  </tr>
  <tr>
    <td align="right">Languages used server side</td><td>Javascript (Rhino), Java, Scala</td><td>Javascript (node.js)</td>
  </tr>
  <tr>
    <td align="right">Lines of server side Javascript code</td><td>101410</td><td>5330</td>
  </tr>
  <tr>
    <td align="right">RAM Usage immediately after start</td><td>257 MB</td><td>16 MB</td>
  </tr>
</table>

# Installation
1. Download latest node.js version from <http://nodejs.org/> and build it with this instructions <https://github.com/joyent/node/wiki/Installation>. <br>
The Node.js version of your Linux repository might be too old/new. Please compile from the source to get sure you have the correct version. We support node.js version 0.4.*
2. Install npm `curl http://npmjs.org/install.sh | sh`
3. Ensure you have installed the sqlite develob libraries, gzip and git `apt-get install libsqlite3-dev gzip git-core`
4. Clone the git repository `git clone 'git://github.com/Pita/etherpad-lite.git'`
5. Install the dependencies `cd etherpad-lite && npm install`
6. Start it with `bin/run.sh`
7. Open your web browser and visit <http://localhost:9001>

# Next Steps
You can modify the settings in the file settings.json

You can update to the latest version with `git pull origin && npm install`

You can debug with `bin/runDebug.sh`

# Develop
If you're new to git and github, start here <http://learn.github.com/p/intro.html>.

If you're new to node.js, start with this video <http://youtu.be/jo_B4LTHi3I>.

If you wanna find out how Etherpads Easysync works (the library that makes it realy realtime), start with this [PDF](https://github.com/Pita/etherpad-lite/raw/master/doc/easysync/easysync-full-description.pdf) (complex, but worth reading it).

You know all this and just want to know how you can help? Look at the [TODO list](https://github.com/Pita/etherpad-lite/wiki/TODO).
You can join the [mailinglist](http://groups.google.com/group/etherpad-lite-dev) or go to the freenode irc channel [#etherpad-lite-dev](http://webchat.freenode.net?channels=#etherpad-lite-dev)

You also help the project, if you only host a ep-lite instance and share your experience with us.

# License
[Apache License v2](http://www.apache.org/licenses/LICENSE-2.0.html)

