/**
 * The Settings Modul reads the settings out of settings.json and provides
 * this information to the other modules
 */

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var fs = require("fs");
var os = require("os");
var path = require('path');

var defaults = {};
/**
 * The IP ep-lite should listen to
 */
defaults.ip = "0.0.0.0";

/**
 * The Port ep-lite should listen to
 */
defaults.port = 9001;
/*
 * The Type of the database
 */
defaults.dbType = "dirty";
/**
 * This setting is passed with dbType to ueberDB to set up the database
 */
defaults.dbSettings = { "filename" : "../var/dirty.db" };
/**
 * The default Text of a new pad
 */
defaults.defaultPadText = "Welcome to Etherpad Lite!\n\nThis pad text is synchronized as you type, so that everyone viewing this page sees the same text. This allows you to collaborate seamlessly on documents!\n\nEtherpad Lite on Github: http:\/\/j.mp/ep-lite\n";

/**
 * A flag that requires any user to have a valid session (via the api) before accessing a pad
 */
defaults.requireSession = false;

/**
 * A flag that prevents users from creating new pads
 */
defaults.editOnly = false;

/**
 * A flag that shows if minification is enabled or not
 */
defaults.minify = true;

/**
 * The path of the abiword executable
 */
defaults.abiword = null;

/**
 * The log level of log4js
 */
defaults.logLevel = "INFO";

/**
 * Http basic auth, with "user:password" format
 */
defaults.httpAuth = null;



var Settings = function(settings) {

    this.ip = settings.ip || defaults.ip;
    this.port = settings.port || defaults.port;
    this.dbType = settings.dbType || defaults.dbType;
    this.dbSettings = settings.dbSettings || defaults.dbSettings;
    this.defaultPadText = settings.defaultPadText || defaults.defaultPadText;
    this.requireSessions = settings.requireSessions || defaults.requireSessions;
    this.editOnly = settings.editOnly || defaults.editOnly;
    this.minify = settings.minify || defaults.minify;
    this.abiword = settings.abiword || defaults.abiword;
    this.logLevel = settings.logLevel || defaults.logLevel;
    this.httpAuth = settings.httpAuth || defaults.httpAuth;
};

//TODO this is shit
Settings.prototype.abiwordAvailable = function abiwordAvailable() {
    if(this.abiword != null) {
        return os.type().indexOf("Windows") != -1 ? "withoutPDF" : "yes";
    } else {
        return "no";
    }
};

exports.Settings = Settings;
//read the settings sync

exports.parseSettings = function parseSettings(path) {

    var settingsStr = fs.readFileSync(path).toString();
    settingsStr = settingsStr.replace(/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+/gm,"").replace(/#.*/g,"").replace(/\/\/.*/g,"");
    var pojo;
    //try to parse the settings
    try {
        pojo = JSON.parse(settingsStr);
    }
    catch(e) {
        console.log(e);
        process.exit(1);
    }
    return new Settings(pojo);

};


