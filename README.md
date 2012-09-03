# Our goal is to make collaborative editing the standard on the web

# About
Etherpad lite is a really-real time collaborative editor spawned from the Hell fire of Etherpad. 
We're reusing the well tested Etherpad easysync library to make it really realtime. Etherpad Lite 
is based on node.js ergo is much lighter and more stable than the original Etherpad. Our hope 
is that this will encourage more users to use and install a realtime collaborative editor. A smaller, manageable and well 
documented codebase makes it easier for developers to improve the code and contribute towards the project. 

Etherpad Lite is optimized to be easy embeddable. It provides a [HTTP API](https://github.com/Pita/etherpad-lite/wiki/HTTP-API) 
that allows your web application to manage pads, users and groups. 
There are several clients in for this API:

* [PHP](https://github.com/TomNomNom/etherpad-lite-client), thx to [TomNomNom](https://github.com/TomNomNom)
* [.Net](https://github.com/ja-jo/EtherpadLiteDotNet), thx to [ja-jo](https://github.com/ja-jo)
* [Node.js](https://github.com/tomassedovic/etherpad-lite-client-js), thx to [tomassedovic](https://github.com/tomassedovic)
* [Ruby](https://github.com/jhollinger/ruby-etherpad-lite), thx to [jhollinger](https://github.com/jhollinger)
* [Python](https://github.com/devjones/PyEtherpadLite), thx to [devjones](https://github.com/devjones)

There is also a [jQuery plugin](https://github.com/johnyma22/etherpad-lite-jquery-plugin) that helps you to embed Pads into your website

**Online demo**<br>
Visit <http://beta.etherpad.org> to test it live

Here is the **[FAQ](https://github.com/Pita/etherpad-lite/wiki/FAQ)**

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
    <td align="right">Lines of server side Javascript code</td><td>~101k</td><td>~9k</td>
  </tr>
  <tr>
    <td align="right">RAM Usage immediately after start</td><td>257 MB (grows to ~1GB)</td><td>16 MB (grows to ~30MB)</td>
  </tr>
</table>

# Installation

## Windows

1. Download <http://etherpad.org/etherpad-lite-win.zip>
2. Extract the file
3. Open the extracted folder and double click `start.bat`
4. Open your web browser and browse to <http://localhost:9001>. You like it? Look at the 'Next Steps' section below

## Linux

**As root:**

<ol>
  <li>Install the dependencies. We need gzip, git, curl, libssl develop libraries, python and gcc. <br><i>For Debian/Ubuntu</i> <code>apt-get install gzip git-core curl python libssl-dev pkg-config build-essential</code><br>
  <i>For Fedora/CentOS</i> <code>yum install gzip git-core curl python openssl-devel && yum groupinstall "Development Tools"</code>
  </li><br>
  <li>Install node.js 
    <ol type="a">
      <li>Download the latest node.js release (both 0.6 and 0.8 are supported, recommended is stable 0.8.8) from <a href="http://nodejs.org/download">http://nodejs.org</a></li>
      <li>Extract it with <code>tar xf node-v0.8.8</code></li>
      <li>Move into the node folder <code>cd node-v0.8.8</code> and build node with <code>./configure && make && make install</code></li>
    </ol>
  </li>
</ol>

**As any user (we recommend creating a separate user called etherpad-lite):**

<ol start="3">
  <li>Move to a folder where you want to install Etherpad Lite. Clone the git repository <code>git clone 'git://github.com/Pita/etherpad-lite.git'</code><br></li>
  <li>Change into the directory containing the Etherpad Lite source code clone with <code>cd etherpad-lite</code><br></li>
  <li>Start it with <code>bin/run.sh</code><br>&nbsp;</li>
  <li>Open your web browser and visit <a href="http://localhost:9001">http://localhost:9001</a>. You like it? Look at the 'Next Steps' section below</li>
</ol>

## Next Steps
You can modify the settings in the file `settings.json`

If you have multiple settings files, you may pass one to `bin/run.sh` using the `-s|--settings` option. This allows you to run multiple Etherpad Lite instances from the same installation.

You should use a dedicated database such as "mysql" if you are planning on using etherpad-lite in a production environment, the "dirty" database driver is only for testing and/or development purposes.

You can update to the latest version with `git pull origin`. The next start with bin/run.sh will update the dependencies. You probably need to do a `npm cache clean jshint` before, in case that throws an error message. 


Look at this wiki pages: 

* [How to deploy Etherpad Lite as a service](https://github.com/Pita/etherpad-lite/wiki/How-to-deploy-Etherpad-Lite-as-a-service)
* [How to put Etherpad Lite behind a reverse Proxy](https://github.com/Pita/etherpad-lite/wiki/How-to-put-Etherpad-Lite-behind-a-reverse-Proxy)
* [How to customize your Etherpad Lite installation](https://github.com/Pita/etherpad-lite/wiki/How-to-customize-your-Etherpad-Lite-installation)
* [How to use Etherpad-Lite with jQuery](https://github.com/Pita/etherpad-lite/wiki/How-to-use-Etherpad-Lite-with-jQuery)
* [How to use Etherpad Lite with MySQL](https://github.com/Pita/etherpad-lite/wiki/How-to-use-Etherpad-Lite-with-MySQL)
* [Sites that run Etherpad Lite](https://github.com/Pita/etherpad-lite/wiki/Sites-that-run-Etherpad-Lite)
* [How to migrate the database from Etherpad to Etherpad Lite](https://github.com/Pita/etherpad-lite/wiki/How-to-migrate-the-database-from-Etherpad-to-Etherpad-Lite)

You can find more information in the [wiki](https://github.com/Pita/etherpad-lite/wiki). Feel free to improve these wiki pages

# Develop
If you're new to git and github, start by watching [this video](http://youtu.be/67-Q26YH97E) then read this [git guide](http://learn.github.com/p/intro.html).

If you're new to node.js, start with this video <http://youtu.be/jo_B4LTHi3I>.

You can debug with `bin/debugRun.sh`

If you want to find out how Etherpads Easysync works (the library that makes it really realtime), start with this [PDF](https://github.com/Pita/etherpad-lite/raw/master/doc/easysync/easysync-full-description.pdf) (complex, but worth reading).

You know all this and just want to know how you can help? Look at the [TODO list](https://github.com/Pita/etherpad-lite/wiki/TODO).
You can join the [mailinglist](http://groups.google.com/group/etherpad-lite-dev) or go to the freenode irc channel [#etherpad-lite-dev](http://webchat.freenode.net?channels=#etherpad-lite-dev)

You also help the project, if you only host a Etherpad Lite instance and share your experience with us.

Please consider using [jshint](http://www.jshint.com/about/) if you plan to
contribute to Etherpad Lite.

# Modules created for this project

* [ueberDB](https://github.com/Pita/ueberDB) "transforms every database into a object key value store" - manages all database access
* [channels](https://github.com/Pita/channels) "Event channels in node.js" - ensures that ueberDB operations are atomic and in series for each key
* [async-stacktrace](https://github.com/Pita/async-stacktrace) "Improves node.js stacktraces and makes it easier to handle errors"

# Donations
* [Etherpad Foundation Flattr] (http://flattr.com/thing/71378/Etherpad-Foundation)
* [Paypal] (http://etherpad.org) <-- Click the donate button

# License
[Apache License v2](http://www.apache.org/licenses/LICENSE-2.0.html)