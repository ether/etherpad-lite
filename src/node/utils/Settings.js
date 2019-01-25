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

var absolutePaths = require('./AbsolutePaths');
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
exports.root = absolutePaths.findEtherpadRoot();
console.log(`All relative paths will be interpreted relative to the identified Etherpad base dir: ${exports.root}`);

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

/*
 * Skin name.
 *
 * Initialized to null, so we can spot an old configuration file and invite the
 * user to update it before falling back to the default.
 */
exports.skinName = null;

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
exports.dbSettings = { "filename" : path.join(exports.root, "var/dirty.db") };

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
},

/**
 * Whether certain shortcut keys are enabled for a user in the pad
 */
exports.padShortcutEnabled = {
  "altF9" : true,
  "altC" : true,
  "delete" : true,
  "cmdShift2" : true,
  "return" : true,
  "esc" : true,
  "cmdS" : true,
  "tab" : true,
  "cmdZ" : true,
  "cmdY" : true,
  "cmdB" : true,
  "cmdI" : true,
  "cmdU" : true,
  "cmd5" : true,
  "cmdShiftL" : true,
  "cmdShiftN" : true,
  "cmdShift1" : true,
  "cmdShiftC" : true,
  "cmdH" : true,
  "ctrlHome" : true,
  "pageUp" : true,
  "pageDown" : true,
},

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
 * Number of seconds to automatically reconnect pad
 */
exports.automaticReconnectionTimeout = 0;

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

/*
* Show settings in admin page, by default it is true
*/
exports.showSettingsInAdminPage = true;

/*
* By default, when caret is moved out of viewport, it scrolls the minimum height needed to make this
* line visible.
*/
exports.scrollWhenFocusLineIsOutOfViewport = {
  /*
  * Percentage of viewport height to be additionally scrolled.
  */
  "percentage": {
    "editionAboveViewport": 0,
    "editionBelowViewport": 0
  },
  /*
  * Time (in milliseconds) used to animate the scroll transition. Set to 0 to disable animation
  */
  "duration": 0,
  /*
  * Flag to control if it should scroll when user places the caret in the last line of the viewport
  */
  /*
  * Percentage of viewport height to be additionally scrolled when user presses arrow up
  * in the line of the top of the viewport.
   */
  "percentageToScrollWhenUserPressesArrowUp": 0,
  "scrollWhenCaretIsInTheLastLineOfViewport": false
};

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
  var settingsFilename = absolutePaths.makeAbsolute(argv.settings || "settings.json");
  
  // Discover if a credential file exists
  var credentialsFilename = absolutePaths.makeAbsolute(argv.credentials || "credentials.json");

  var settingsStr, credentialsStr;
  try{
    //read the settings sync
    settingsStr = fs.readFileSync(settingsFilename).toString();
    console.info(`Settings loaded from: ${settingsFilename}`);
  } catch(e){
    console.warn(`No settings file found in ${settingsFilename}. Continuing using defaults!`);
  }

  try{
    //read the credentials sync
    credentialsStr = fs.readFileSync(credentialsFilename).toString();
    console.info(`Credentials file read from: ${credentialsFilename}`);
  } catch(e){
    // Doesn't matter if no credentials file found..
    console.info(`No credentials file found in ${credentialsFilename}. Ignoring.`);
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
    console.error(`There was an error processing your settings file from ${settingsFilename}:` + e.message);
    process.exit(1);
  }

  if(credentialsStr) {
    credentialsStr = jsonminify(credentialsStr).replace(",]","]").replace(",}","}");
    credentials = JSON.parse(credentialsStr);
  }

  //loop trough the settings
  for(var i in settings)
  {
    //test if the setting start with a lowercase character
    if(i.charAt(0).search("[a-z]") !== 0)
    {
      console.warn(`Settings should start with a lowercase character: '${i}'`);
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
      console.warn(`Unknown Setting: '${i}'. This setting doesn't exist or it was removed`);
    }
  }

  //loop trough the settings
  for(var i in credentials)
  {
    //test if the setting start with a lowercase character
    if(i.charAt(0).search("[a-z]") !== 0)
    {
      console.warn(`Settings should start with a lowercase character: '${i}'`);
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
      console.warn(`Unknown Setting: '${i}'. This setting doesn't exist or it was removed`);
    }
  }

  log4js.configure(exports.logconfig);//Configure the logging appenders
  log4js.setGlobalLogLevel(exports.loglevel);//set loglevel
  process.env['DEBUG'] = 'socket.io:' + exports.loglevel; // Used by SocketIO for Debug
  log4js.replaceConsole();

  if (!exports.skinName) {
    console.warn(`No "skinName" parameter found. Please check out settings.json.template and update your settings.json. Falling back to the default "no-skin".`);
    exports.skinName = "no-skin";
  }

  // checks if skinName has an acceptable value, otherwise falls back to "no-skin"
  if (exports.skinName) {
    const skinBasePath = path.join(exports.root, "src", "static", "skins");
    const countPieces = exports.skinName.split(path.sep).length;

    if (countPieces != 1) {
      console.error(`skinName must be the name of a directory under "${skinBasePath}". This is not valid: "${exports.skinName}". Falling back to the default "no-skin".`);

      exports.skinName = "no-skin";
    }

    // informative variable, just for the log messages
    var skinPath = path.normalize(path.join(skinBasePath, exports.skinName));

    // what if someone sets skinName == ".." or "."? We catch him!
    if (absolutePaths.isSubdir(skinBasePath, skinPath) === false) {
      console.error(`Skin path ${skinPath} must be a subdirectory of ${skinBasePath}. Falling back to the default "no-skin".`);

      exports.skinName = "no-skin";
      skinPath = path.join(skinBasePath, exports.skinName);
    }

    if (fs.existsSync(skinPath) === false) {
      console.error(`Skin path ${skinPath} does not exist. Falling back to the default "no-skin".`);
      exports.skinName = "no-skin";
      skinPath = path.join(skinBasePath, exports.skinName);
    }

    console.info(`Using skin "${exports.skinName}" in dir: ${skinPath}`);
  }

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
    var sessionkeyFilename = absolutePaths.makeAbsolute(argv.sessionkey || "./SESSIONKEY.txt");
    try {
      exports.sessionKey = fs.readFileSync(sessionkeyFilename,"utf8");
      console.info(`Session key loaded from: ${sessionkeyFilename}`);
    } catch(e) {
      console.info(`Session key file "${sessionkeyFilename}" not found. Creating with random contents.`);
      exports.sessionKey = randomString(32);
      fs.writeFileSync(sessionkeyFilename,exports.sessionKey,"utf8");
    }
  } else {
    console.warn("Declaring the sessionKey in the settings.json is deprecated. This value is auto-generated now. Please remove the setting from the file.");
  }

  if(exports.dbType === "dirty"){
    var dirtyWarning = "DirtyDB is used. This is fine for testing but not recommended for production.";
    if(!exports.suppressErrorsInPadText){
      exports.defaultPadText = exports.defaultPadText + "\nWarning: " + dirtyWarning + suppressDisableMsg;
    }

    exports.dbSettings.filename = absolutePaths.makeAbsolute(exports.dbSettings.filename);
    console.warn(dirtyWarning + ` File location: ${exports.dbSettings.filename}`);
  }
};

// initially load settings
exports.reloadSettings();


