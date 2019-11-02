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

/*
 * This setting is used if you need authentication and/or
 * authorization. Note: /admin always requires authentication, and
 * either authorization by a module, or a user with is_admin set
 */
exports.requireAuthentication = false;
exports.requireAuthorization = false;
exports.users = {};

/*
 * Show settings in admin page, by default it is true
 */
exports.showSettingsInAdminPage = true;

/*
 * By default, when caret is moved out of viewport, it scrolls the minimum
 * height needed to make this line visible.
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
   * Time (in milliseconds) used to animate the scroll transition. Set to 0 to
   * disable animation
   */
  "duration": 0,

  /*
   * Percentage of viewport height to be additionally scrolled when user presses arrow up
   * in the line of the top of the viewport.
   */
  "percentageToScrollWhenUserPressesArrowUp": 0,

  /*
   * Flag to control if it should scroll when user places the caret in the last
   * line of the viewport
   */
  "scrollWhenCaretIsInTheLastLineOfViewport": false
};

/*
 * Expose Etherpad version in the web interface and in the Server http header.
 *
 * Do not enable on production machines.
 */
exports.exposeVersion = false;

// checks if abiword is avaiable
exports.abiwordAvailable = function()
{
  if (exports.abiword != null) {
    return os.type().indexOf("Windows") != -1 ? "withoutPDF" : "yes";
  } else {
    return "no";
  }
};

exports.sofficeAvailable = function() {
  if (exports.soffice != null) {
    return os.type().indexOf("Windows") != -1 ? "withoutPDF": "yes";
  } else {
    return "no";
  }
};

exports.exportAvailable = function() {
  var abiword = exports.abiwordAvailable();
  var soffice = exports.sofficeAvailable();

  if (abiword == "no" && soffice == "no") {
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
  try {
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
  } catch(e) {
    console.warn("Can't get git version for server header\n" + e.message)
  }
  return version;
}

// Return etherpad version from package.json
exports.getEpVersion = function() {
  return require('ep_etherpad-lite/package.json').version;
}

/**
 * Receives a settingsObj and, if the property name is a valid configuration
 * item, stores it in the module's exported properties via a side effect.
 *
 * This code refactors a previous version that copied & pasted the same code for
 * both "settings.json" and "credentials.json".
 */
function storeSettings(settingsObj) {
  for (var i in settingsObj) {
    // test if the setting starts with a lowercase character
    if (i.charAt(0).search("[a-z]") !== 0) {
      console.warn(`Settings should start with a lowercase character: '${i}'`);
    }

    // we know this setting, so we overwrite it
    // or it's a settings hash, specific to a plugin
    if (exports[i] !== undefined || i.indexOf('ep_') == 0) {
      if (_.isObject(settingsObj[i]) && !_.isArray(settingsObj[i])) {
        exports[i] = _.defaults(settingsObj[i], exports[i]);
      } else {
        exports[i] = settingsObj[i];
      }
    } else {
      // this setting is unknown, output a warning and throw it away
      console.warn(`Unknown Setting: '${i}'. This setting doesn't exist or it was removed`);
    }
  }
}

/*
 * If stringValue is a numeric string, or its value is "true" or "false", coerce
 * them to appropriate JS types. Otherwise return stringValue as-is.
 */
function coerceValue(stringValue) {
    // cooked from https://stackoverflow.com/questions/175739/built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
    const isNumeric = !isNaN(stringValue) && !isNaN(parseFloat(stringValue) && isFinite(stringValue));

    if (isNumeric) {
      // detected numeric string. Coerce to a number

      return +stringValue;
    }

    // the boolean literal case is easy.
    if (stringValue === "true" ) {
      return true;
    }

    if (stringValue === "false") {
      return false;
    }

    // otherwise, return this value as-is
    return stringValue;
}

/**
 * Takes a javascript object containing Etherpad's configuration, and returns
 * another object, in which all the string properties whose value is of the form
 * "${ENV_VAR}" or "${ENV_VAR:default_value}" got their value replaced with the
 * contents of the given environment variable, or with a default value.
 *
 * By definition, an environment variable's value is always a string. However,
 * the code base makes use of the various json types. To maintain compatiblity,
 * some heuristics is applied:
 *
 * - if ENV_VAR does not exist in the environment, null is returned;
 * - if ENV_VAR's value is "true" or "false", it is converted to the js boolean
 *   values true or false;
 * - if ENV_VAR's value looks like a number, it is converted to a js number
 *   (details in the code).
 *
 * The following is a scheme of the behaviour of this function:
 *
 * +---------------------------+---------------+------------------+
 * | Configuration string in   | Value of      | Resulting confi- |
 * | settings.json             | ENV_VAR       | guration value   |
 * |---------------------------|---------------|------------------|
 * | "${ENV_VAR}"              | "some_string" | "some_string"    |
 * | "${ENV_VAR}"              | "9001"        | 9001             |
 * | "${ENV_VAR}"              | undefined     | null             |
 * | "${ENV_VAR:some_default}" | "some_string" | "some_string"    |
 * | "${ENV_VAR:some_default}" | undefined     | "some_default"   |
 * +---------------------------+---------------+------------------+
 *
 * IMPLEMENTATION NOTE: variable substitution is performed doing a round trip
 *     conversion to/from json, using a custom replacer parameter in
 *     JSON.stringify(), and parsing the JSON back again. This ensures that
 *     environment variable replacement is performed even on nested objects.
 *
 * see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#The_replacer_parameter
 */
function lookupEnvironmentVariables(obj) {
  const stringifiedAndReplaced = JSON.stringify(obj, (key, value) => {
    /*
     * the first invocation of replacer() is with an empty key. Just go on, or
     * we would zap the entire object.
     */
    if (key === '') {
      return value;
    }

    /*
     * If we received from the configuration file a number, a boolean or
     * something that is not a string, we can be sure that it was a literal
     * value. No need to perform any variable substitution.
     *
     * The environment variable expansion syntax "${ENV_VAR}" is just a string
     * of specific form, after all.
     */
    if (typeof value !== 'string') {
      return value;
    }

    /*
     * Let's check if the string value looks like a variable expansion (e.g.:
     * "${ENV_VAR}" or "${ENV_VAR:default_value}")
     */
    // MUXATOR 2019-03-21: we could use named capture groups here once we migrate to nodejs v10
    const match = value.match(/^\$\{([^:]*)(:(.*))?\}$/);

    if (match === null) {
      // no match: use the value literally, without any substitution

      return value;
    }

    /*
     * We found the name of an environment variable. Let's read its actual value
     * and its default value, if given
     */
    const envVarName = match[1];
    const envVarValue = process.env[envVarName];
    const defaultValue = match[3];

    if ((envVarValue === undefined) && (defaultValue === undefined)) {
      console.warn(`Environment variable "${envVarName}" does not contain any value for configuration key "${key}", and no default was given. Returning null. Please check your configuration and environment settings.`);

      /*
       * We have to return null, because if we just returned undefined, the
       * configuration item "key" would be stripped from the returned object.
       */
      return null;
    }

    if ((envVarValue === undefined) && (defaultValue !== undefined)) {
      console.debug(`Environment variable "${envVarName}" not found for configuration key "${key}". Falling back to default value.`);

      return coerceValue(defaultValue);
    }

    // envVarName contained some value.

    /*
     * For numeric and boolean strings let's convert it to proper types before
     * returning it, in order to maintain backward compatibility.
     */
    console.debug(`Configuration key "${key}" will be read from environment variable "${envVarName}"`);

    return coerceValue(envVarValue);
  });

  const newSettings = JSON.parse(stringifiedAndReplaced);

  return newSettings;
}

/**
 * - reads the JSON configuration file settingsFilename from disk
 * - strips the comments
 * - replaces environment variables calling lookupEnvironmentVariables()
 * - returns a parsed Javascript object
 *
 * The isSettings variable only controls the error logging.
 */
function parseSettings(settingsFilename, isSettings) {
  let settingsStr = "";

  let settingsType, notFoundMessage, notFoundFunction;

  if (isSettings) {
    settingsType = "settings";
    notFoundMessage = "Continuing using defaults!";
    notFoundFunction = console.warn;
  } else {
    settingsType = "credentials";
    notFoundMessage = "Ignoring.";
    notFoundFunction = console.info;
  }

  try {
    //read the settings file
    settingsStr = fs.readFileSync(settingsFilename).toString();
  } catch(e) {
    notFoundFunction(`No ${settingsType} file found in ${settingsFilename}. ${notFoundMessage}`);

    // or maybe undefined!
    return null;
  }

  try {
    settingsStr = jsonminify(settingsStr).replace(",]","]").replace(",}","}");

    const settings = JSON.parse(settingsStr);

    console.info(`${settingsType} loaded from: ${settingsFilename}`);

    const replacedSettings = lookupEnvironmentVariables(settings);

    return replacedSettings;
  } catch(e) {
    console.error(`There was an error processing your ${settingsType} file from ${settingsFilename}: ${e.message}`);

    process.exit(1);
  }
}

exports.reloadSettings = function reloadSettings() {
  // Discover where the settings file lives
  var settingsFilename = absolutePaths.makeAbsolute(argv.settings || "settings.json");

  // Discover if a credential file exists
  var credentialsFilename = absolutePaths.makeAbsolute(argv.credentials || "credentials.json");

  // try to parse the settings
  var settings = parseSettings(settingsFilename, true);

  // try to parse the credentials
  var credentials = parseSettings(credentialsFilename, false);

  storeSettings(settings);
  storeSettings(credentials);

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

  if (exports.users) {
    /*
     * Prune from export.users any user that has no password attribute, or whose
     * password attribute is "null".
     *
     * This is used by the settings.json in the default Dockerfile to eschew
     * creating an admin user if no password is set.
     */
    var filteredUsers = _.pick(exports.users, function(userProperties, username) {
      if (userProperties.hasOwnProperty("password") === false) {
        console.warn(`Removing user "${username}", because it has no "password" field.`);

        return false;
      }

      if (userProperties.password === null) {
        console.warn(`Removing user "${username}", because its password is null.`);

        return false;
      }

      // This user has a password, and its password is not null. Keep it.
      return true;
    });

    exports.users = filteredUsers;
  }

  if (exports.abiword) {
    // Check abiword actually exists
    if (exports.abiword != null) {
      fs.exists(exports.abiword, function(exists) {
        if (!exists) {
          var abiwordError = "Abiword does not exist at this path, check your settings file.";
          if (!exports.suppressErrorsInPadText) {
            exports.defaultPadText = exports.defaultPadText + "\nError: " + abiwordError + suppressDisableMsg;
          }
          console.error(abiwordError + ` File location: ${exports.abiword}`);
          exports.abiword = null;
        }
      });
    }
  }

  if (exports.soffice) {
    fs.exists(exports.soffice, function(exists) {
      if (!exists) {
        var sofficeError = "soffice (libreoffice) does not exist at this path, check your settings file.";

        if (!exports.suppressErrorsInPadText) {
          exports.defaultPadText = exports.defaultPadText + "\nError: " + sofficeError + suppressDisableMsg;
        }
        console.error(sofficeError + ` File location: ${exports.soffice}`);
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

  if (exports.dbType === "dirty") {
    var dirtyWarning = "DirtyDB is used. This is fine for testing but not recommended for production.";
    if (!exports.suppressErrorsInPadText) {
      exports.defaultPadText = exports.defaultPadText + "\nWarning: " + dirtyWarning + suppressDisableMsg;
    }

    exports.dbSettings.filename = absolutePaths.makeAbsolute(exports.dbSettings.filename);
    console.warn(dirtyWarning + ` File location: ${exports.dbSettings.filename}`);
  }
};

// initially load settings
exports.reloadSettings();
