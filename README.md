# A really-real time collaborative word processor for the web
![alt text](http://i.imgur.com/zYrGkg3.gif "Etherpad in action on PrimaryPad")

# About
Etherpad is a really-real time collaborative editor maintained by the Etherpad Community.

Etherpad is written in Javascript(99.9%) on both the server and client so it's easy for developers to maintain and add new features.  Because of this Etherpad has tons of customizations that you can leverage.

Etherpad is designed to be easily embeddable and provides a [HTTP API](https://github.com/ether/etherpad-lite/wiki/HTTP-API)
that allows your web application to manage pads, users and groups. It is recommended to use the [available client implementations](https://github.com/ether/etherpad-lite/wiki/HTTP-API-client-libraries) in order to interact with this API. 

There is also a [jQuery plugin](https://github.com/ether/etherpad-lite-jquery-plugin) that helps you to embed Pads into your website.

There's also a full-featured plugin framework, allowing you to easily add your own features.  By default your Etherpad is rather sparce and because Etherpad takes a lot of it's inspiration from Wordpress plugins are really easy to install and update.  Once you have Etherpad installed you should visit the plugin page and take control.

Finally, Etherpad comes with translations into most languages!  Users are automatically delivered the correct language for their local settings.

**Visit [beta.etherpad.org](http://beta.etherpad.org) to test it live.  Hosted by [Joyent](http://joyent.com)**

Also, check out the **[FAQ](https://github.com/ether/etherpad-lite/wiki/FAQ)**, really!

# Installation

Etherpad works with node v0.8 and v0.10, only. (We don't support v0.6)

## Windows

### Prebuilt windows package
This package works out of the box on any windows machine, but it's not very useful for developing purposes...

1. [Download the latest windows package](http://etherpad.org/downloads/etherpad-lite-win-1.2.91-7492fb18a4.zip)
2. Extract the folder

Now, run `start.bat` and open <http://localhost:9001> in your browser. You like it? [Next steps](#next-steps).

### Fancy install
You'll need [node.js](http://nodejs.org) and (optionally, though recommended) git.

1. Grab the source, either
  - download <https://github.com/ether/etherpad-lite/zipball/master>
  - or `git clone https://github.com/ether/etherpad-lite.git` (for this you need git, obviously)
2. start `bin\installOnWindows.bat`

Now, run `start.bat` and open <http://localhost:9001> in your browser.

Update to the latest version with `git pull origin`, then run `bin\installOnWindows.bat`, again.

[Next steps](#next-steps).

## GNU/Linux and other UNIX-like systems
You'll need gzip, git, curl, libssl develop libraries, python and gcc.  
*For Debian/Ubuntu*: `apt-get install gzip git-core curl python libssl-dev pkg-config build-essential`  
*For Fedora/CentOS*: `yum install gzip git-core curl python openssl-devel && yum groupinstall "Development Tools"`
*For FreeBSD*: `portinstall node node, npm and git (optional)`

Additionally, you'll need [node.js](http://nodejs.org) installed, Ideally the latest stable version, be careful of installing nodejs from apt.

**As any user (we recommend creating a separate user called etherpad-lite):**

1. Move to a folder where you want to install Etherpad Lite. Clone the git repository `git clone git://github.com/ether/etherpad-lite.git`
2. Change into the new directory containing the cloned source code `cd etherpad-lite`

Now, run `bin/run.sh` and open <http://127.0.0.1:9001> in your browser. 

Update to the latest version with `git pull origin`. The next start with bin/run.sh will update the dependencies.

You like it? [Next steps](#next-steps).

# Next Steps

## Tweak the settings
You can initially modify the settings in `settings.json`. (If you need to handle multiple settings files, you can pass the path to a settings file to `bin/run.sh` using the `-s|--settings` option. This allows you to run multiple Etherpad instances from the same installation.)  Once you have access to your /admin section settings can be modified through the web browser.

You should use a dedicated database such as "mysql", if you are planning on using etherpad-in a production environment, since the "dirtyDB" database driver is only for testing and/or development purposes.

## Helpful resources
The [wiki](https://github.com/ether/etherpad-lite/wiki) is your one-stop resource for Tutorials and How-to's, really check it out! Also, feel free to improve these wiki pages.

Documentation can be found in `docs/`.

# Development

## Things you should know
Read this [git guide](http://learn.github.com/p/index.html) and watch this [video on getting started with Etherpad Development](http://youtu.be/67-Q26YH97E).

If you're new to node.js, start with Ryan Dahl's [Introduction to Node.js](http://youtu.be/jo_B4LTHi3I).

You can debug Etherpad using `bin/debugRun.sh`.

If you want to find out how Etherpad's `Easysync` works (the library that makes it really realtime), start with this [PDF](https://github.com/ether/etherpad-lite/raw/master/doc/easysync/easysync-full-description.pdf) (complex, but worth reading).

## Getting started
You know all this and just want to know how you can help?

Look at the [TODO list](https://github.com/ether/etherpad-lite/wiki/TODO) and our [Issue tracker](https://github.com/ether/etherpad-lite/issues). (Please consider using [jshint](http://www.jshint.com/about/), if you plan to contribute code.)

Also, and most importantly, read our [**Developer Guidelines**](https://github.com/ether/etherpad-lite/blob/master/CONTRIBUTING.md), really!

# Get in touch
Join the [mailinglist](http://groups.google.com/group/etherpad-lite-dev) and make some noise on our busy freenode irc channel [#etherpad-lite-dev](http://webchat.freenode.net?channels=#etherpad-lite-dev)!

# Modules created for this project

* [ueberDB](https://github.com/Pita/ueberDB) "transforms every database into a object key value store" - manages all database access
* [channels](https://github.com/Pita/channels) "Event channels in node.js" - ensures that ueberDB operations are atomic and in series for each key
* [async-stacktrace](https://github.com/Pita/async-stacktrace) "Improves node.js stacktraces and makes it easier to handle errors"

# Donate!
* [Flattr] (http://flattr.com/thing/71378/Etherpad-Foundation)
* Paypal - Press the donate button on [etherpad.org](http://etherpad.org)
* [Bitcoin] (https://coinbase.com/checkouts/1e572bf8a82e4663499f7f1f66c2d15a)

# License
[Apache License v2](http://www.apache.org/licenses/LICENSE-2.0.html)
