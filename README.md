# A really-real time collaborative word processor for the web
![Demo Etherpad Animated Jif](https://i.imgur.com/zYrGkg3.gif "Etherpad in action on PrimaryPad")

# About
Etherpad is a really-real time collaborative editor scalable to thousands of simultanious real time users.  Unlike all other collaborative tools Etherpad provides full fidelity data export and portability making it fully GDPR compliant.

**[Try it out](http://beta.etherpad.org)**

# Installation

## Requirements
- `nodejs` >= **6.9.0** (preferred: `nodejs` >= **8.9**)

## Uber-Quick Ubuntu
```
curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
sudo apt-get install -y nodejs
git clone https://github.com/ether/etherpad-lite.git && cd etherpad-lite && bin/run.sh
```

## GNU/Linux and other UNIX-like systems
You'll need git and [node.js](https://nodejs.org) installed (minimum required Node version: **6.9.0**, preferred: >= **8.9**).

**As any user (we recommend creating a separate user called etherpad):**

1. Move to a folder where you want to install Etherpad. Clone the git repository: `git clone git://github.com/ether/etherpad-lite.git`
2. Change into the new directory containing the cloned source code: `cd etherpad-lite`
3. run `bin/run.sh` and open <http://127.0.0.1:9001> in your browser.

To update to the latest released version, execute `git pull origin`. The next start with `bin/run.sh` will update the dependencies.

[Next steps](#next-steps).

## Windows

### Prebuilt Windows package
This package works out of the box on any windows machine, but it's not very useful for developing purposes...

1. [Download the latest Windows package](http://etherpad.org/#download)
2. Extract the folder

Now, run `start.bat` and open <http://localhost:9001> in your browser. You like it? [Next steps](#next-steps).

### Manually install on Windows
You'll need [node.js](https://nodejs.org) and (optionally, though recommended) git.

1. Grab the source, either
  - download <https://github.com/ether/etherpad-lite/zipball/master>
  - or `git clone https://github.com/ether/etherpad-lite.git` (for this you need git, obviously)
2. start `bin\installOnWindows.bat`

Now, run `start.bat` and open <http://localhost:9001> in your browser.

Update to the latest version with `git pull origin`, then run `bin\installOnWindows.bat`, again.

If cloning to a subdirectory within another project, you may need to do the following:

1. Start the server manually (e.g. `node/node_modules/ep_etherpad-lite/node/server.js`)
2. Edit the db `filename` in `settings.json` to the relative directory with the file (e.g. `application/lib/etherpad-lite/var/dirty.db`)
3. Add auto-generated files to the main project `.gitignore`

# Next Steps

## Tweak the settings
You can modify the settings in `settings.json`.
If you need to handle multiple settings files, you can pass the path to a settings file to `bin/run.sh` using the `-s|--settings` option: this allows you to run multiple Etherpad instances from the same installation.
Similarly, `--credentials` can be used to give a settings override file, `--apikey` to give a different APIKEY.txt file and `--sessionkey` to give a non-default SESSIONKEY.txt.
Once you have access to your /admin section settings can be modified through the web browser.

You should use a dedicated database such as "mysql", if you are planning on using etherpad-in a production environment, since the "dirtyDB" database driver is only for testing and/or development purposes.

## Secure your installation
If you have enabled authentication in `users` section in `settings.json`, it is a good security practice to **store hashes instead of plain text passwords** in that file. This is _especially_ advised if you are running a production installation.

Please install [ep_hash_auth plugin](https://www.npmjs.com/package/ep_hash_auth) and configure it.
If you prefer, `ep_hash_auth` also gives you the option of storing the users in a custom directory in the file system, without having to edit `settings.json` and restart Etherpad each time.

## Plugins and themes

Etherpad is very customizable through plugins. Instructions for installing themes and plugins can be found in [the plugin wiki article](https://github.com/ether/etherpad-lite/wiki/Available-Plugins).

## Helpful resources
The [wiki](https://github.com/ether/etherpad-lite/wiki) is your one-stop resource for Tutorials and How-to's.

Documentation can be found in `doc/`.

# Development

## Things you should know
Understand [git](https://training.github.com/) and watch this [video on getting started with Etherpad Development](https://youtu.be/67-Q26YH97E).

If you're new to node.js, start with Ryan Dahl's [Introduction to Node.js](https://youtu.be/jo_B4LTHi3I).

You can debug Etherpad using `bin/debugRun.sh`.

If you want to find out how Etherpad's `Easysync` works (the library that makes it really realtime), start with this [PDF](https://github.com/ether/etherpad-lite/raw/master/doc/easysync/easysync-full-description.pdf) (complex, but worth reading).

## Contributing
Read our [**Developer Guidelines**](https://github.com/ether/etherpad-lite/blob/master/CONTRIBUTING.md)

# Get in touch
[mailinglist](https://groups.google.com/group/etherpad-lite-dev)
[#etherpad-lite-dev freenode IRC](https://webchat.freenode.net?channels=#etherpad-lite-dev)!

# Languages
Etherpad is written in JavaScript on both the server and client so it's easy for developers to maintain and add new features.

# HTTP API
Etherpad is designed to be easily embeddable and provides a [HTTP API](https://github.com/ether/etherpad-lite/wiki/HTTP-API)
that allows your web application to manage pads, users and groups. It is recommended to use the [available client implementations](https://github.com/ether/etherpad-lite/wiki/HTTP-API-client-libraries) in order to interact with this API.

# jQuery plugin
There is a [jQuery plugin](https://github.com/ether/etherpad-lite-jquery-plugin) that helps you to embed Pads into your website.

# Plugin Framework
Etherpad offers a plugin framework, allowing you to easily add your own features.  By default your Etherpad is extremely light-weight and it's up to you to customize your experience.  Once you have Etherpad installed you should visit the plugin page and take control.

# Translations / Localizations  (i18n / l10n)
Etherpad comes with translations into all languages thanks to the team at TranslateWiki.

# FAQ
Visit the **[FAQ](https://github.com/ether/etherpad-lite/wiki/FAQ)**.

# Donate!
* [Flattr](https://flattr.com/thing/71378/Etherpad-Foundation)
* Paypal - Press the donate button on [etherpad.org](http://etherpad.org)
* [Bitcoin](https://coinbase.com/checkouts/1e572bf8a82e4663499f7f1f66c2d15a)

All donations go to the Etherpad foundation which is part of Software Freedom Conservency

# License
[Apache License v2](http://www.apache.org/licenses/LICENSE-2.0.html)
