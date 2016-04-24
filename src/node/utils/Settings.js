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
var npm = require("npm/lib/npm.js");
var jsonminify = require("jsonminify");
var log4js = require("log4js");
var randomString = require("./randomstring");
var suppressDisableMsg = " -- To suppress these warning messages change suppressErrorsInPadText to true in your settings.json\n";
var _ = require("underscore");

/* Root path of the installation */
exports.root = path.normalize(path.join(npm.dir, ".."));

/**
 * The app title, visible e.g. in the browser window
 */
exports.title = "Etherpad";

/**
 * The app favicon fully specified url, visible e.g. in the browser window
 */
exports.favicon = "favicon.ico";
exports.faviconPad = "../" + exports.favicon;
exports.faviconTimeslider = "../../" + exports.favicon;

/**
 * The IP ep-lite should listen to
 */
exports.ip = "0.0.0.0";

/**
 * The Port ep-lite should listen to
 */
exports.port = process.env.PORT || 9001;

/**
 * Should we suppress Error messages from being in Pad Contents
 */
exports.suppressErrorsInPadText = false;

/**
 * The SSL signed server key and the Certificate Authority's own certificate
 * default case: ep-lite does *not* use SSL. A signed server key is not required in this case.
 */
exports.ssl = false;

/**
 * socket.io transport methods
 **/
exports.socketTransportProtocols = ['xhr-polling', 'jsonp-polling', 'htmlfile'];

/*
 * The Type of the database
 */
exports.dbType = "dirty";
/**
 * This setting is passed with dbType to ueberDB to set up the database
 */
exports.dbSettings = { "filename" : path.join(exports.root, "dirty.db") };

/**
 * The default Text of a new pad
 */
exports.defaultPadText = "Welcome to Etherpad!\n\nThis pad text is synchronized as you type, so that everyone viewing this page sees the same text. This allows you to collaborate seamlessly on documents!\n\nEtherpad on Github: https:\/\/github.com\/ether\/etherpad-lite\n";

/**
 * The default Pad Settings for a user (Can be overridden by changing the setting
 */
exports.padOptions = {
  "noColors": false,
  "showControls": true,
  "showChat": true,
  "showLineNumbers": true,
  "useMonospaceFont": false,
  "userName": false,
  "userColor": false,
  "rtl": false,
  "alwaysShowChat": false,
  "chatAndUsers": false,
  "lang": "en-gb"
}

/**
 * The toolbar buttons and order.
 */
exports.toolbar = {
  left: [
    ["bold", "italic", "underline", "strikethrough"],
    ["orderedlist", "unorderedlist", "indent", "outdent"],
    ["undo", "redo"],
    ["clearauthorship"]
  ],
  right: [
    ["importexport", "timeslider", "savedrevision"],
    ["settings", "embed"],
    ["showusers"]
  ],
  timeslider: [
    ["timeslider_export", "timeslider_settings", "timeslider_returnToPad"]
  ]
}

/**
 * A flag that requires any user to have a valid session (via the api) before accessing a pad
 */
exports.requireSession = false;

/**
 * A flag that prevents users from creating new pads
 */
exports.editOnly = false;

/**
 * A flag that bypasses password prompts for users with valid sessions
 */
exports.sessionNoPassword = false;

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
 * The path of the libreoffice executable
 */
exports.soffice = null;

/**
 * The path of the tidy executable
 */
exports.tidyHtml = null;

/**
 * Should we support none natively supported file types on import?
 */
exports.allowUnknownFileEnds = true;

/**
 * The log level of log4js
 */
exports.loglevel = "INFO";

/**
 * Disable IP logging
 */
exports.disableIPlogging = false;

/**
 * Disable Load Testing
 */
exports.loadTest = false;

/**
 * Enable indentation on new lines
 */
exports.indentationOnNewLine = true;

/*
* log4js appender configuration
*/
exports.logconfig = { appenders: [{ type: "console" }]};

/*
* Session Key, do not sure this.
*/
exports.sessionKey = false;

/*
* Trust Proxy, whether or not trust the x-forwarded-for header.
*/
exports.trustProxy = false;

/* This setting is used if you need authentication and/or
 * authorization. Note: /admin always requires authentication, and
 * either authorization by a module, or a user with is_admin set */
exports.requireAuthentication = false;
exports.requireAuthorization = false;
exports.users = {};

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
};

exports.sofficeAvailable = function () {
  if(exports.soffice != null) {
    return os.type().indexOf("Windows") != -1 ? "withoutPDF": "yes";
  } else {
    return "no";
  }
};

exports.exportAvailable = function () {
  var abiword = exports.abiwordAvailable();
  var soffice = exports.sofficeAvailable();

  if(abiword == "no" && soffice == "no") {
    return "no";
  } else if ((abiword == "withoutPDF" && soffice == "no") || (abiword == "no" && soffice == "withoutPDF")) {
    return "withoutPDF";
  } else {
    return "yes";
  }
};

// Provide git version if available
exports.getGitCommit = function() {
  var version = "";
  try
  {
    var rootPath = path.resolve(npm.dir, '..');
    if (fs.lstatSync(rootPath + '/.git').isFile()) {
      rootPath = fs.readFileSync(rootPath + '/.git', "utf8");
      rootPath = rootPath.split(' ').pop().trim();
    } else {
      rootPath += '/.git';
    }
    var ref = fs.readFileSync(rootPath + "/HEAD", "utf-8");
    var refPath = rootPath + "/" + ref.substring(5, ref.indexOf("\n"));
    version = fs.readFileSync(refPath, "utf-8");
    version = version.substring(0, 7);
  }
  catch(e)
  {
    console.warn("Can't get git version for server header\n" + e.message)
  }
  return version;
}

// Return etherpad version from package.json
exports.getEpVersion = function() {
  return require('ep_etherpad-lite/package.json').version;
}

exports.reloadSettings = function reloadSettings() {
  // Discover where the settings file lives
  var settingsFilename = argv.settings || "settings.json";

  // Discover if a credential file exists
  var credentialsFilename = argv.credentials || "credentials.json";

  if (path.resolve(settingsFilename)===settingsFilename) {
    settingsFilename = path.resolve(settingsFilename);
  } else {
    settingsFilename = path.resolve(path.join(exports.root, settingsFilename));
  }

  if (path.resolve(credentialsFilename)===credentialsFilename) {
    credentialsFilename = path.resolve(credentialsFilename);
  }

  var settingsStr, credentialsStr;
  try{
    //read the settings sync
    settingsStr = fs.readFileSync(settingsFilename).toString();
  } catch(e){
    console.warn('No settings file found. Continuing using defaults!');
  }

  try{
    //read the credentials sync
    credentialsStr = fs.readFileSync(credentialsFilename).toString();
  } catch(e){
    // Doesn't matter if no credentials file found..
  }

  // try to parse the settings
  var settings;
  var credentials;
  try {
    if(settingsStr) {
      settingsStr = jsonminify(settingsStr).replace(",]","]").replace(",}","}");
      settings = JSON.parse(settingsStr);
    }
  }catch(e){
    console.error('There was an error processing your settings.json file: '+e.message);
    process.exit(1);
  }

  if(credentialsStr) {
    credentialsStr = jsonminify(credentialsStr).replace(",]","]").replace(",}","}");
    credentials = JSON.parse(credentialsStr);
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
    //or it's a settings hash, specific to a plugin
    if(exports[i] !== undefined || i.indexOf('ep_')==0)
    {
      if (_.isObject(settings[i]) && !_.isArray(settings[i])) {
        exports[i] = _.defaults(settings[i], exports[i]);
      } else {
        exports[i] = settings[i];
      }
    }
    //this setting is unkown, output a warning and throw it away
    else
    {
      console.warn("Unknown Setting: '" + i + "'. This setting doesn't exist or it was removed");
    }
  }

  //loop trough the settings
  for(var i in credentials)
  {
    //test if the setting start with a low character
    if(i.charAt(0).search("[a-z]") !== 0)
    {
      console.warn("Settings should start with a low character: '" + i + "'");
    }

    //we know this setting, so we overwrite it
    //or it's a settings hash, specific to a plugin
    if(exports[i] !== undefined || i.indexOf('ep_')==0)
    {
      if (_.isObject(credentials[i]) && !_.isArray(credentials[i])) {
        exports[i] = _.defaults(credentials[i], exports[i]);
      } else {
        exports[i] = credentials[i];
      }
    }
    //this setting is unkown, output a warning and throw it away
    else
    {
      console.warn("Unknown Setting: '" + i + "'. This setting doesn't exist or it was removed");
    }
  }

  log4js.configure(exports.logconfig);//Configure the logging appenders
  log4js.setGlobalLogLevel(exports.loglevel);//set loglevel
  process.env['DEBUG'] = 'socket.io:' + exports.loglevel; // Used by SocketIO for Debug
  log4js.replaceConsole();

  if(exports.abiword){
    // Check abiword actually exists
    if(exports.abiword != null)
    {
      fs.exists(exports.abiword, function(exists) {
        if (!exists) {
          var abiwordError = "Abiword does not exist at this path, check your settings file";
          if(!exports.suppressErrorsInPadText){
            exports.defaultPadText = exports.defaultPadText + "\nError: " + abiwordError + suppressDisableMsg;
          }
          console.error(abiwordError);
          exports.abiword = null;
        }
      });
    }
  }

  if(exports.soffice) {
    fs.exists(exports.soffice, function (exists) {
      if(!exists) {
        var sofficeError = "SOffice does not exist at this path, check your settings file";

        if(!exports.suppressErrorsInPadText) {
          exports.defaultPadText = exports.defaultPadText + "\nError: " + sofficeError + suppressDisableMsg;
        }
        console.error(sofficeError);
        exports.soffice = null;
      }
    });
  }

  if (!exports.sessionKey) {
    try {
      exports.sessionKey = fs.readFileSync("./SESSIONKEY.txt","utf8");
    } catch(e) {
      exports.sessionKey = randomString(32);
      fs.writeFileSync("./SESSIONKEY.txt",exports.sessionKey,"utf8");
    }
  } else {
    console.warn("Declaring the sessionKey in the settings.json is deprecated. This value is auto-generated now. Please remove the setting from the file.");
  }

  if(exports.dbType === "dirty"){
    var dirtyWarning = "DirtyDB is used. This is fine for testing but not recommended for production.";
    if(!exports.suppressErrorsInPadText){
      exports.defaultPadText = exports.defaultPadText + "\nWarning: " + dirtyWarning + suppressDisableMsg;
    }
    console.warn(dirtyWarning);
  }
};

// initially load settings
exports.reloadSettings();


