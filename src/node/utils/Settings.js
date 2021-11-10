'use strict';
/**
 * The Settings module reads the settings out of settings.json and provides
 * this information to the other modules
 *
 * TODO muxator 2020-04-14:
 *
 * 1) get rid of the reloadSettings() call at module loading;
 * 2) provide a factory method that configures the settings module at runtime,
 *    reading the file name either from command line parameters, from a function
 *    argument, or falling back to a default.
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

const absolutePaths = require('./AbsolutePaths');
const deepEqual = require('fast-deep-equal/es6');
const fs = require('fs');
const os = require('os');
const path = require('path');
const argv = require('./Cli').argv;
const jsonminify = require('jsonminify');
const log4js = require('log4js');
const randomString = require('./randomstring');
const suppressDisableMsg = ' -- To suppress these warning messages change ' +
    'suppressErrorsInPadText to true in your settings.json\n';
const _ = require('underscore');

const logger = log4js.getLogger('settings');

// Exported values that settings.json and credentials.json cannot override.
const nonSettings = [
  'credentialsFilename',
  'settingsFilename',
];

// This is a function to make it easy to create a new instance. It is important to not reuse a
// config object after passing it to log4js.configure() because that method mutates the object. :(
const defaultLogConfig = () => ({appenders: [{type: 'console'}]});
const defaultLogLevel = 'INFO';

const initLogging = (logLevel, config) => {
  // log4js.configure() modifies exports.logconfig so check for equality first.
  const logConfigIsDefault = deepEqual(config, defaultLogConfig());
  log4js.configure(config);
  log4js.setGlobalLogLevel(logLevel);
  log4js.replaceConsole();
  // Log the warning after configuring log4js to increase the chances the user will see it.
  if (!logConfigIsDefault) logger.warn('The logconfig setting is deprecated.');
};

// Initialize logging as early as possible with reasonable defaults. Logging will be re-initialized
// with the user's chosen log level and logger config after the settings have been loaded.
initLogging(defaultLogLevel, defaultLogConfig());

/* Root path of the installation */
exports.root = absolutePaths.findEtherpadRoot();
logger.info('All relative paths will be interpreted relative to the identified ' +
            `Etherpad base dir: ${exports.root}`);
exports.settingsFilename = absolutePaths.makeAbsolute(argv.settings || 'settings.json');
exports.credentialsFilename = absolutePaths.makeAbsolute(argv.credentials || 'credentials.json');

/**
 * The app title, visible e.g. in the browser window
 */
exports.title = 'Etherpad';

/**
 * Pathname of the favicon you want to use. If null, the skin's favicon is
 * used if one is provided by the skin, otherwise the default Etherpad favicon
 * is used. If this is a relative path it is interpreted as relative to the
 * Etherpad root directory.
 */
exports.favicon = null;

/*
 * Skin name.
 *
 * Initialized to null, so we can spot an old configuration file and invite the
 * user to update it before falling back to the default.
 */
exports.skinName = null;

exports.skinVariants = 'super-light-toolbar super-light-editor light-background';

/**
 * The IP ep-lite should listen to
 */
exports.ip = '0.0.0.0';

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

exports.socketIo = {
  /**
   * Maximum permitted client message size (in bytes).
   *
   * All messages from clients that are larger than this will be rejected. Large values make it
   * possible to paste large amounts of text, and plugins may require a larger value to work
   * properly, but increasing the value increases susceptibility to denial of service attacks
   * (malicious clients can exhaust memory).
   */
  maxHttpBufferSize: 10000,
};

/*
 * The Type of the database
 */
exports.dbType = 'dirty';
/**
 * This setting is passed with dbType to ueberDB to set up the database
 */
exports.dbSettings = {filename: path.join(exports.root, 'var/dirty.db')};

/**
 * The default Text of a new pad
 */
exports.defaultPadText = [
  'Welcome to Etherpad!',
  '',
  'This pad text is synchronized as you type, so that everyone viewing this page sees the same ' +
      'text. This allows you to collaborate seamlessly on documents!',
  '',
  'Etherpad on Github: https://github.com/ether/etherpad-lite',
].join('\n');

/**
 * The default Pad Settings for a user (Can be overridden by changing the setting
 */
exports.padOptions = {
  noColors: false,
  showControls: true,
  showChat: true,
  showLineNumbers: true,
  useMonospaceFont: false,
  userName: false,
  userColor: false,
  rtl: false,
  alwaysShowChat: false,
  chatAndUsers: false,
  lang: 'en-gb',
};

/**
 * Whether certain shortcut keys are enabled for a user in the pad
 */
exports.padShortcutEnabled = {
  altF9: true,
  altC: true,
  delete: true,
  cmdShift2: true,
  return: true,
  esc: true,
  cmdS: true,
  tab: true,
  cmdZ: true,
  cmdY: true,
  cmdB: true,
  cmdI: true,
  cmdU: true,
  cmd5: true,
  cmdShiftL: true,
  cmdShiftN: true,
  cmdShift1: true,
  cmdShiftC: true,
  cmdH: true,
  ctrlHome: true,
  pageUp: true,
  pageDown: true,
};

/**
 * The toolbar buttons and order.
 */
exports.toolbar = {
  left: [
    ['bold', 'italic', 'underline', 'strikethrough'],
    ['orderedlist', 'unorderedlist', 'indent', 'outdent'],
    ['undo', 'redo'],
    ['clearauthorship'],
  ],
  right: [
    ['importexport', 'timeslider', 'savedrevision'],
    ['settings', 'embed'],
    ['showusers'],
  ],
  timeslider: [
    ['timeslider_export', 'timeslider_settings', 'timeslider_returnToPad'],
  ],
};

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
exports.maxAge = 1000 * 60 * 60 * 6; // 6 hours

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
exports.loglevel = defaultLogLevel;

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
 * Disable dump of objects preventing a clean exit
 */
exports.dumpOnUncleanExit = false;

/**
 * Enable indentation on new lines
 */
exports.indentationOnNewLine = true;

/*
 * log4js appender configuration
 */
exports.logconfig = defaultLogConfig();

/*
 * Session Key, do not sure this.
 */
exports.sessionKey = false;

/*
 * Trust Proxy, whether or not trust the x-forwarded-for header.
 */
exports.trustProxy = false;

/*
 * Settings controlling the session cookie issued by Etherpad.
 */
exports.cookie = {
  /*
   * Value of the SameSite cookie property. "Lax" is recommended unless
   * Etherpad will be embedded in an iframe from another site, in which case
   * this must be set to "None". Note: "None" will not work (the browser will
   * not send the cookie to Etherpad) unless https is used to access Etherpad
   * (either directly or via a reverse proxy with "trustProxy" set to true).
   *
   * "Strict" is not recommended because it has few security benefits but
   * significant usability drawbacks vs. "Lax". See
   * https://stackoverflow.com/q/41841880 for discussion.
   */
  sameSite: 'Lax',
};

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
  percentage: {
    editionAboveViewport: 0,
    editionBelowViewport: 0,
  },

  /*
   * Time (in milliseconds) used to animate the scroll transition. Set to 0 to
   * disable animation
   */
  duration: 0,

  /*
   * Percentage of viewport height to be additionally scrolled when user presses arrow up
   * in the line of the top of the viewport.
   */
  percentageToScrollWhenUserPressesArrowUp: 0,

  /*
   * Flag to control if it should scroll when user places the caret in the last
   * line of the viewport
   */
  scrollWhenCaretIsInTheLastLineOfViewport: false,
};

/*
 * Expose Etherpad version in the web interface and in the Server http header.
 *
 * Do not enable on production machines.
 */
exports.exposeVersion = false;

/*
 * Override any strings found in locale directories
 */
exports.customLocaleStrings = {};

/*
 * From Etherpad 1.8.3 onwards, import and export of pads is always rate
 * limited.
 *
 * The default is to allow at most 10 requests per IP in a 90 seconds window.
 * After that the import/export request is rejected.
 *
 * See https://github.com/nfriedly/express-rate-limit for more options
 */
exports.importExportRateLimiting = {
  // duration of the rate limit window (milliseconds)
  windowMs: 90000,

  // maximum number of requests per IP to allow during the rate limit window
  max: 10,
};

/*
 * From Etherpad 1.9.0 onwards, commits from individual users are rate limited
 *
 * The default is to allow at most 10 changes per IP in a 1 second window.
 * After that the change is rejected.
 *
 * See https://github.com/animir/node-rate-limiter-flexible/wiki/Overall-example#websocket-single-connection-prevent-flooding for more options
 */
exports.commitRateLimiting = {
  // duration of the rate limit window (seconds)
  duration: 1,

  // maximum number of chanes per IP to allow during the rate limit window
  points: 10,
};

/*
 * From Etherpad 1.8.3 onwards, the maximum allowed size for a single imported
 * file is always bounded.
 *
 * File size is specified in bytes. Default is 50 MB.
 */
exports.importMaxFileSize = 50 * 1024 * 1024;

/*
 * Disable Admin UI tests
 */
exports.enableAdminUITests = false;


// checks if abiword is avaiable
exports.abiwordAvailable = () => {
  if (exports.abiword != null) {
    return os.type().indexOf('Windows') !== -1 ? 'withoutPDF' : 'yes';
  } else {
    return 'no';
  }
};

exports.sofficeAvailable = () => {
  if (exports.soffice != null) {
    return os.type().indexOf('Windows') !== -1 ? 'withoutPDF' : 'yes';
  } else {
    return 'no';
  }
};

exports.exportAvailable = () => {
  const abiword = exports.abiwordAvailable();
  const soffice = exports.sofficeAvailable();

  if (abiword === 'no' && soffice === 'no') {
    return 'no';
  } else if ((abiword === 'withoutPDF' && soffice === 'no') ||
      (abiword === 'no' && soffice === 'withoutPDF')) {
    return 'withoutPDF';
  } else {
    return 'yes';
  }
};

// Provide git version if available
exports.getGitCommit = () => {
  let version = '';
  try {
    let rootPath = exports.root;
    if (fs.lstatSync(`${rootPath}/.git`).isFile()) {
      rootPath = fs.readFileSync(`${rootPath}/.git`, 'utf8');
      rootPath = rootPath.split(' ').pop().trim();
    } else {
      rootPath += '/.git';
    }
    const ref = fs.readFileSync(`${rootPath}/HEAD`, 'utf-8');
    if (ref.startsWith('ref: ')) {
      const refPath = `${rootPath}/${ref.substring(5, ref.indexOf('\n'))}`;
      version = fs.readFileSync(refPath, 'utf-8');
    } else {
      version = ref;
    }
    version = version.substring(0, 7);
  } catch (e) {
    logger.warn(`Can't get git version for server header\n${e.message}`);
  }
  return version;
};

// Return etherpad version from package.json
exports.getEpVersion = () => require('../../package.json').version;

/**
 * Receives a settingsObj and, if the property name is a valid configuration
 * item, stores it in the module's exported properties via a side effect.
 *
 * This code refactors a previous version that copied & pasted the same code for
 * both "settings.json" and "credentials.json".
 */
const storeSettings = (settingsObj) => {
  for (const i of Object.keys(settingsObj || {})) {
    if (nonSettings.includes(i)) {
      logger.warn(`Ignoring setting: '${i}'`);
      continue;
    }

    // test if the setting starts with a lowercase character
    if (i.charAt(0).search('[a-z]') !== 0) {
      logger.warn(`Settings should start with a lowercase character: '${i}'`);
    }

    // we know this setting, so we overwrite it
    // or it's a settings hash, specific to a plugin
    if (exports[i] !== undefined || i.indexOf('ep_') === 0) {
      if (_.isObject(settingsObj[i]) && !Array.isArray(settingsObj[i])) {
        exports[i] = _.defaults(settingsObj[i], exports[i]);
      } else {
        exports[i] = settingsObj[i];
      }
    } else {
      // this setting is unknown, output a warning and throw it away
      logger.warn(`Unknown Setting: '${i}'. This setting doesn't exist or it was removed`);
    }
  }
};

/*
 * If stringValue is a numeric string, or its value is "true" or "false", coerce
 * them to appropriate JS types. Otherwise return stringValue as-is.
 *
 * Please note that this function is used for converting types for default
 * values in the settings file (for example: "${PORT:9001}"), and that there is
 * no coercition for "null" values.
 *
 * If the user wants a variable to be null by default, he'll have to use the
 * short syntax "${ABIWORD}", and not "${ABIWORD:null}": the latter would result
 * in the literal string "null", instead.
 */
const coerceValue = (stringValue) => {
  // cooked from https://stackoverflow.com/questions/175739/built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
  const isNumeric = !isNaN(stringValue) && !isNaN(parseFloat(stringValue) && isFinite(stringValue));

  if (isNumeric) {
    // detected numeric string. Coerce to a number

    return +stringValue;
  }

  switch (stringValue) {
    case 'true': return true;
    case 'false': return false;
    case 'undefined': return undefined;
    case 'null': return null;
    default: return stringValue;
  }
};

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
const lookupEnvironmentVariables = (obj) => {
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
    const match = value.match(/^\$\{([^:]*)(:((.|\n)*))?\}$/);

    if (match == null) {
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
      logger.warn(`Environment variable "${envVarName}" does not contain any value for ` +
                  `configuration key "${key}", and no default was given. Using null. ` +
                  'THIS BEHAVIOR MAY CHANGE IN A FUTURE VERSION OF ETHERPAD; you should ' +
                  'explicitly use "null" as the default if you want to continue to use null.');

      /*
       * We have to return null, because if we just returned undefined, the
       * configuration item "key" would be stripped from the returned object.
       */
      return null;
    }

    if ((envVarValue === undefined) && (defaultValue !== undefined)) {
      logger.debug(`Environment variable "${envVarName}" not found for ` +
                   `configuration key "${key}". Falling back to default value.`);

      return coerceValue(defaultValue);
    }

    // envVarName contained some value.

    /*
     * For numeric and boolean strings let's convert it to proper types before
     * returning it, in order to maintain backward compatibility.
     */
    logger.debug(
        `Configuration key "${key}" will be read from environment variable "${envVarName}"`);

    return coerceValue(envVarValue);
  });

  const newSettings = JSON.parse(stringifiedAndReplaced);

  return newSettings;
};

/**
 * - reads the JSON configuration file settingsFilename from disk
 * - strips the comments
 * - replaces environment variables calling lookupEnvironmentVariables()
 * - returns a parsed Javascript object
 *
 * The isSettings variable only controls the error logging.
 */
const parseSettings = (settingsFilename, isSettings) => {
  let settingsStr = '';

  let settingsType, notFoundMessage, notFoundFunction;

  if (isSettings) {
    settingsType = 'settings';
    notFoundMessage = 'Continuing using defaults!';
    notFoundFunction = logger.warn.bind(logger);
  } else {
    settingsType = 'credentials';
    notFoundMessage = 'Ignoring.';
    notFoundFunction = logger.info.bind(logger);
  }

  try {
    // read the settings file
    settingsStr = fs.readFileSync(settingsFilename).toString();
  } catch (e) {
    notFoundFunction(`No ${settingsType} file found in ${settingsFilename}. ${notFoundMessage}`);

    // or maybe undefined!
    return null;
  }

  try {
    settingsStr = jsonminify(settingsStr).replace(',]', ']').replace(',}', '}');

    const settings = JSON.parse(settingsStr);

    logger.info(`${settingsType} loaded from: ${settingsFilename}`);

    const replacedSettings = lookupEnvironmentVariables(settings);

    return replacedSettings;
  } catch (e) {
    logger.error(`There was an error processing your ${settingsType} ` +
                 `file from ${settingsFilename}: ${e.message}`);

    process.exit(1);
  }
};

exports.reloadSettings = () => {
  const settings = parseSettings(exports.settingsFilename, true);
  const credentials = parseSettings(exports.credentialsFilename, false);
  storeSettings(settings);
  storeSettings(credentials);

  initLogging(exports.loglevel, exports.logconfig);

  if (!exports.skinName) {
    logger.warn('No "skinName" parameter found. Please check out settings.json.template and ' +
                'update your settings.json. Falling back to the default "colibris".');
    exports.skinName = 'colibris';
  }

  // checks if skinName has an acceptable value, otherwise falls back to "colibris"
  if (exports.skinName) {
    const skinBasePath = path.join(exports.root, 'src', 'static', 'skins');
    const countPieces = exports.skinName.split(path.sep).length;

    if (countPieces !== 1) {
      logger.error(`skinName must be the name of a directory under "${skinBasePath}". This is ` +
                   `not valid: "${exports.skinName}". Falling back to the default "colibris".`);

      exports.skinName = 'colibris';
    }

    // informative variable, just for the log messages
    let skinPath = path.join(skinBasePath, exports.skinName);

    // what if someone sets skinName == ".." or "."? We catch him!
    if (absolutePaths.isSubdir(skinBasePath, skinPath) === false) {
      logger.error(`Skin path ${skinPath} must be a subdirectory of ${skinBasePath}. ` +
                   'Falling back to the default "colibris".');

      exports.skinName = 'colibris';
      skinPath = path.join(skinBasePath, exports.skinName);
    }

    if (fs.existsSync(skinPath) === false) {
      logger.error(`Skin path ${skinPath} does not exist. Falling back to the default "colibris".`);
      exports.skinName = 'colibris';
      skinPath = path.join(skinBasePath, exports.skinName);
    }

    logger.info(`Using skin "${exports.skinName}" in dir: ${skinPath}`);
  }

  if (exports.abiword) {
    // Check abiword actually exists
    if (exports.abiword != null) {
      fs.exists(exports.abiword, (exists) => {
        if (!exists) {
          const abiwordError = 'Abiword does not exist at this path, check your settings file.';
          if (!exports.suppressErrorsInPadText) {
            exports.defaultPadText += `\nError: ${abiwordError}${suppressDisableMsg}`;
          }
          logger.error(`${abiwordError} File location: ${exports.abiword}`);
          exports.abiword = null;
        }
      });
    }
  }

  if (exports.soffice) {
    fs.exists(exports.soffice, (exists) => {
      if (!exists) {
        const sofficeError =
            'soffice (libreoffice) does not exist at this path, check your settings file.';

        if (!exports.suppressErrorsInPadText) {
          exports.defaultPadText += `\nError: ${sofficeError}${suppressDisableMsg}`;
        }
        logger.error(`${sofficeError} File location: ${exports.soffice}`);
        exports.soffice = null;
      }
    });
  }

  if (!exports.sessionKey) {
    const sessionkeyFilename = absolutePaths.makeAbsolute(argv.sessionkey || './SESSIONKEY.txt');
    try {
      exports.sessionKey = fs.readFileSync(sessionkeyFilename, 'utf8');
      logger.info(`Session key loaded from: ${sessionkeyFilename}`);
    } catch (e) {
      logger.info(
          `Session key file "${sessionkeyFilename}" not found. Creating with random contents.`);
      exports.sessionKey = randomString(32);
      fs.writeFileSync(sessionkeyFilename, exports.sessionKey, 'utf8');
    }
  } else {
    logger.warn('Declaring the sessionKey in the settings.json is deprecated. ' +
                'This value is auto-generated now. Please remove the setting from the file. -- ' +
                'If you are seeing this error after restarting using the Admin User ' +
                'Interface then you can ignore this message.');
  }

  if (exports.dbType === 'dirty') {
    const dirtyWarning = 'DirtyDB is used. This is not recommended for production.';
    if (!exports.suppressErrorsInPadText) {
      exports.defaultPadText += `\nWarning: ${dirtyWarning}${suppressDisableMsg}`;
    }

    exports.dbSettings.filename = absolutePaths.makeAbsolute(exports.dbSettings.filename);
    logger.warn(`${dirtyWarning} File location: ${exports.dbSettings.filename}`);
  }

  if (exports.ip === '') {
    // using Unix socket for connectivity
    logger.warn('The settings file contains an empty string ("") for the "ip" parameter. The ' +
                '"port" parameter will be interpreted as the path to a Unix socket to bind at.');
  }

  /*
   * At each start, Etherpad generates a random string and appends it as query
   * parameter to the URLs of the static assets, in order to force their reload.
   * Subsequent requests will be cached, as long as the server is not reloaded.
   *
   * For the rationale behind this choice, see
   * https://github.com/ether/etherpad-lite/pull/3958
   *
   * ACHTUNG: this may prevent caching HTTP proxies to work
   * TODO: remove the "?v=randomstring" parameter, and replace with hashed filenames instead
   */
  exports.randomVersionString = randomString(4);
  logger.info(`Random string used for versioning assets: ${exports.randomVersionString}`);
};

exports.exportedForTestingOnly = {
  parseSettings,
};

// initially load settings
exports.reloadSettings();
