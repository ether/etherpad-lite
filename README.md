# About
Etherpad lite is a really-real time collaborative editor spawned from the Hell fire of Etherpad. 
We're reusing the well tested Etherpad easysync library to make it really realtime. Etherpad Lite 
is based on node.js what makes it much lighter and more stable than the original Etherpad. Our hope 
is that this will encourage more users to install a realtime collaborative editor. A smaller and well 
documented codebase makes it easier for developers to improve the code. Etherpad Lite is optimized 
to be easy embeddable. Look at our [FAQ Page](https://github.com/Pita/etherpad-lite/wiki/FAQ)

**Online demo**<br>
Visit <http://pitapoison.de:9001> to test it live. <br>You can find the same instance behind a nginx, with ssl and in a subpath here -> [https://pad.pitapoison.de/pad/](https://pad.pitapoison.de/pad/)

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
**As root:**

<ol>
  <li>Install all dependencies. We need the sqlite development libraries, gzip, git, curl, libssl develop libraries and python <br><code>apt-get install libsqlite3-dev gzip git-core curl python libssl-dev</code></li><br>
  <li>Install node.js 
    <ol type="a">
      <li>Download the latest <b>0.4.x</b> node.js release from <a href="http://nodejs.org/#download">http://nodejs.org/#download</a></li>
      <li>Extract it with <code>tar xf node-v0.4*</code></li>
      <li>move into the node folder <code>cd node-v0.4*</code> and build node with <code>./configure && make && make install</code></li>
    </ol>
  </li>
  <li>Install npm <code>curl http://npmjs.org/install.sh | sh</code></li>
</ol>

**As any user (we recommend creating a separate user called etherpad-lite):**

<ol start="4">
  <li> Clone the git repository <code>git clone 'git://github.com/Pita/etherpad-lite.git'</code><br>&nbsp;</li>
  <li> Install the dependencies with <code>bin/installDeps.sh</code> <i>(if you have problems at this step, look at the section Troubleshooting below)</i><br>&nbsp;</li>
  <li> Start it with <code>bin/run.sh</code><br>&nbsp;</li>
  <li> Open your web browser and visit <a href="http://localhost:9001">http://localhost:9001</a>. You like it? Look at the 'Next Steps' section below</li>
</ol>

## Troubleshooting

### It fails while installing the sqlite dependency
The sqlite package of some Linux versions (including debian lenny) is too old. We need sqlite >=3.6. You have to use a PPA or debian backports. You find sqlite packages for Ubuntu Hardy [here](https://launchpad.net/~mirabilos/+archive/ppa/+sourcepub/1304941/+listing-archive-extra), Debian Backports can be found [here](http://backports-master.debian.org/Instructions/#index1h2)

### It fails while installing the express dependency, it says my node version is wrong
You might have installed node.js version 0.5. You can check that with `node --version`. Please reinstall node 0.4.x

### My installation process stopped, now it doesn't work anymore, what can I do?
Remove the node_modules folder. This forces run.sh to reinstall all dependencies

## Next Steps
You can modify the settings in the file settings.json

You can update to the latest version with `git pull origin`. The next start with bin/run.sh will update the dependencies

Look at this wiki pages: 

* [How to deploy Etherpad Lite as a service](https://github.com/Pita/etherpad-lite/wiki/How-to-deploy-Etherpad-Lite-as-a-service)
* [How to put Etherpad Lite behind a reverse Proxy](https://github.com/Pita/etherpad-lite/wiki/How-to-put-Etherpad-Lite-behind-a-reverse-Proxy)
* [How to customize your Etherpad Lite installation](https://github.com/Pita/etherpad-lite/wiki/How-to-customize-your-Etherpad-Lite-installation)

You can find more information in the [wiki](https://github.com/Pita/etherpad-lite/wiki). Feel free to improve these wiki pages

# Develop
If you're new to git and github, start here <http://learn.github.com/p/intro.html>.

If you're new to node.js, start with this video <http://youtu.be/jo_B4LTHi3I>.

You can debug with `bin/debugRun.sh`

If you wanna find out how Etherpads Easysync works (the library that makes it really realtime), start with this [PDF](https://github.com/Pita/etherpad-lite/raw/master/doc/easysync/easysync-full-description.pdf) (complex, but worth reading it).

You know all this and just want to know how you can help? Look at the [TODO list](https://github.com/Pita/etherpad-lite/wiki/TODO).
You can join the [mailinglist](http://groups.google.com/group/etherpad-lite-dev) or go to the freenode irc channel [#etherpad-lite-dev](http://webchat.freenode.net?channels=#etherpad-lite-dev)

You also help the project, if you only host a Etherpad Lite instance and share your experience with us.

# Modules created for this project

* [ueberDB](https://github.com/Pita/ueberDB) "transforms every database into a object key value store" - manages all database access
* [doc.md](https://github.com/Pita/doc.md) "A simple JSDoc documentation tool that creates markdown for node.js modules exports" - is used to generate the docs
* [channels](https://github.com/Pita/channels) "Event channels in node.js" - ensures that ueberDB operations are atomic and in series for each key

# License
[Apache License v2](http://www.apache.org/licenses/LICENSE-2.0.html)
