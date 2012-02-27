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
var argv = require('./Cli').argv;

/**
 * The IP ep-lite should listen to
 */
exports.ip = "0.0.0.0";
  
/**
 * The Port ep-lite should listen to
 */
exports.port = 9001;
/*
 * The Type of the database
 */
exports.dbType = "dirty";
/**
 * This setting is passed with dbType to ueberDB to set up the database
 */
exports.dbSettings = { "filename" : "../var/dirty.db" };
/**
 * The default Text of a new pad
 */
exports.defaultPadText = "Welcome to Etherpad Lite!\n\nThis pad text is synchronized as you type, so that everyone viewing this page sees the same text. This allows you to collaborate seamlessly on documents!\n\nEtherpad Lite on Github: http:\/\/j.mp/ep-lite\n";

/**
 * A flag that requires any user to have a valid session (via the api) before accessing a pad
 */
exports.requireSession = false;

/**
 * A flag that prevents users from creating new pads
 */
exports.editOnly = false;

/**
 * Max age that responses will have (affects caching layer).
 */
exports.maxAge = 1000*60*60*6; // 6 hours

/**
 * A flag that shows if minification is enabled or not
 */
exports.minify = true;

/**
 * The path of the abiword executable
 */
exports.abiword = null;

/**
 * The log level of log4js
 */
exports.loglevel = "INFO";

/**
 * Http basic auth, with "user:password" format
 */
exports.httpAuth = null;

//checks if abiword is avaiable
exports.abiwordAvailable = function()
{
  if(exports.abiword != null)
  {
    return os.type().indexOf("Windows") != -1 ? "withoutPDF" : "yes";
  }
  else
  {
    return "no";
  }
}

// Discover where the settings file lives
var settingsFilename = argv.settings || "settings.json";
var settingsPath = settingsFilename.charAt(0) == '/' ? '' : path.normalize(__dirname + "/../../");

//read the settings sync
var settingsStr = fs.readFileSync(settingsPath + settingsFilename).toString();

//remove all comments
settingsStr = settingsStr.replace(/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+/gm,"").replace(/#.*/g,"").replace(/\/\/.*/g,"");

//try to parse the settings
var settings;
try
{
  settings = JSON.parse(settingsStr);
}
catch(e)
{
  console.error("There is a syntax error in your settings.json file");
  console.error(e.message);
  process.exit(1);
}

//loop trough the settings
for(var i in settings)
{
  //test if the setting start with a low character
  if(i.charAt(0).search("[a-z]") !== 0)
  {
    console.warn("Settings should start with a low character: '" + i + "'");
  }

  //we know this setting, so we overwrite it
  if(exports[i] !== undefined)
  {
    exports[i] = settings[i];
  }
  //this setting is unkown, output a warning and throw it away
  else
  {
    console.warn("Unkown Setting: '" + i + "'");
    console.warn("This setting doesn't exist or it was removed");
  }
}
