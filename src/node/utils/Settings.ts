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

import {MapArrayType} from "../types/MapType";
import {SettingsNode} from "./SettingsTree";
import {version} from '../../package.json'
import {findEtherpadRoot, isSubdir, makeAbsolute} from './AbsolutePaths';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {argvP} from "./Cli";
import jsonminify from 'jsonminify';
import log4js from 'log4js';
import randomString from './randomstring';

import _ from 'underscore';



class Settings {

  constructor() {
    // Initialize logging as early as possible with reasonable defaults. Logging will be re-initialized
// with the user's chosen log level and logger config after the settings have been loaded.
    this.initLogging(this.defaultLogConfig(this.defaultLogLevel));
    this.logger.info('All relative paths will be interpreted relative to the identified ' +
      `Etherpad base dir: ${this.root}`);
    // initially load settings
    this.reloadSettings();
  }
  /**
   * The app title, visible e.g. in the browser window
   */
  title = 'Etherpad';
  settingsFilename = makeAbsolute(argvP.settings || 'settings.json');
  credentialsFilename = makeAbsolute(argvP.credentials || 'credentials.json');

  suppressDisableMsg = ' -- To suppress these warning messages change ' +
    'suppressErrorsInPadText to true in your settings.json\n';
  defaultLogLevel = 'INFO';
  private logger = log4js.getLogger('settings');
  /* Root path of the installation */
  root = findEtherpadRoot();
  /**
   * Pathname of the favicon you want to use. If null, the skin's favicon is
   * used if one is provided by the skin, otherwise the default Etherpad favicon
   * is used. If this is a relative path it is interpreted as relative to the
   * Etherpad root directory.
   */
  favicon: string|null = null;
// Exported values that settings.json and credentials.json cannot override.
  nonSettings = [
    'credentialsFilename',
    'settingsFilename',
  ]
  /*
 * Skin name.
 *
 * Initialized to null, so we can spot an old configuration file and invite the
 * user to update it before falling back to the default.
 */
  skinName: string | null = null;
  skinVariants = 'super-light-toolbar super-light-editor light-background';
  ttl = {
    AccessToken: 1 * 60 * 60, // 1 hour in seconds
    AuthorizationCode: 10 * 60, // 10 minutes in seconds
    ClientCredentials: 1 * 60 * 60, // 1 hour in seconds
    IdToken: 1 * 60 * 60, // 1 hour in seconds
    RefreshToken: 1 * 24 * 60 * 60, // 1 day in seconds
  }
  /**
   * Should we suppress Error messages from being in Pad Contents
   */
  suppressErrorsInPadText = false;

  /**
   * The Port ep-lite should listen to
   */
  port = process.env.PORT as unknown as number || 9001;

  /**
   * The IP ep-lite should listen to
   */
  ip: string = '0.0.0.0';

// This is a function to make it easy to create a new instance. It is important to not reuse a
// config object after passing it to log4js.configure() because that method mutates the object. :(
  private defaultLogConfig = (level: string) => ({
    appenders: {console: {type: 'console'}},
    categories: {
      default: {appenders: ['console'], level},
    }
  })

  /**
   * The SSL signed server key and the Certificate Authority's own certificate
   * default case: ep-lite does *not* use SSL. A signed server key is not required in this case.
   */
  ssl:{
    key:string,
    cert:string
    ca?: string[]
  }|false = false;

  /**
   * socket.io transport methods
   **/
  socketTransportProtocols: any[] = ['websocket', 'polling'];
  socketIo = {
    /**
     * Maximum permitted client message size (in bytes).
     *
     * All messages from clients that are larger than this will be rejected. Large values make it
     * possible to paste large amounts of text, and plugins may require a larger value to work
     * properly, but increasing the value increases susceptibility to denial of service attacks
     * (malicious clients can exhaust memory).
     */
    maxHttpBufferSize: 50000,
  };

  /*
  The authentication method used by the server.
  The default value is sso
  If you want to use the old authentication system, change this to apikey
 */
  authenticationMethod = 'sso'
  /*
 * The Type of the database
 */
  dbType = 'dirty';

  /**
   * This setting is passed with dbType to ueberDB to set up the database
   */
  dbSettings = {filename: path.join(this.root, 'var/dirty.db')};
  /**
   * The default Text of a new pad
   */
  defaultPadText = [
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
  padOptions = {
    noColors: false,
    showControls: true,
    showChat: true,
    showLineNumbers: true,
    useMonospaceFont: false,
    userName: null,
    userColor: null,
    rtl: false,
    alwaysShowChat: false,
    chatAndUsers: false,
    lang: null,
  };

  /**
   * Whether certain shortcut keys are enabled for a user in the pad
   */
  padShortcutEnabled = {
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
   public toolbar = {
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
  requireSession = false;

  /**
   * A flag that prevents users from creating new pads
   */
  editOnly = false;

  /**
   * Max age that responses will have (affects caching layer).
   */
  maxAge = 1000 * 60 * 60 * 6; // 6 hours

  /**
   * A flag that shows if minification is enabled or not
   */
  minify = true;

  /**
   * The path of the abiword executable
   */
  abiword = null;

  /**
   * The path of the libreoffice executable
   */
  soffice = null;

  /**
   * Should we support none natively supported file types on import?
   */
  allowUnknownFileEnds = true;

  /**
   * The log level of log4js
   */
  loglevel: any = this.defaultLogLevel;



  /**
   * Disable IP logging
   */
  disableIPlogging = false;

  /**
   * Number of seconds to automatically reconnect pad
   */
  automaticReconnectionTimeout = 0;

  /**
   * Disable Load Testing
   */
  loadTest = false;

  /**
   * Disable dump of objects preventing a clean exit
   */
  dumpOnUncleanExit = false;

  /**
   * Enable indentation on new lines
   */
  indentationOnNewLine = true;

  /*
   * log4js appender configuration
   */
  private logconfig: { categories: { default: { level: string, appenders: string[] } }, appenders: { console: { type: string } } } | null = null;

  /*
   * Deprecated cookie signing key.
   */
  sessionKey: string|null = null;

  /*
   * Trust Proxy, whether or not trust the x-forwarded-for header.
   */
  trustProxy = false;

  /*
   * Settings controlling the session cookie issued by Etherpad.
   */
  cookie = {
    keyRotationInterval: 1 * 24 * 60 * 60 * 1000,
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
    sessionLifetime: 10 * 24 * 60 * 60 * 1000,
    sessionRefreshInterval: 1 * 24 * 60 * 60 * 1000,
  };

  /*
   * This setting is used if you need authentication and/or
   * authorization. Note: /admin always requires authentication, and
   * either authorization by a module, or a user with is_admin set
   */
  requireAuthentication = false;
  requireAuthorization = false;
  users = {};

  /*
   * This setting is used for configuring sso
   */
  sso:{
    issuer: string,
    clients?: any[],

  } = {
    issuer: "http://localhost:9001"
  }

  /*
   * Show settings in admin page, by default it is true
   */
  public showSettingsInAdminPage = true;

  /*
   * By default, when caret is moved out of viewport, it scrolls the minimum
   * height needed to make this line visible.
   */
  scrollWhenFocusLineIsOutOfViewport = {
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
  exposeVersion = false;

  /*
   * Override any strings found in locale directories
   */
  customLocaleStrings = {};

  /*
   * From Etherpad 1.8.3 onwards, import and export of pads is always rate
   * limited.
   *
   * The default is to allow at most 10 requests per IP in a 90 seconds window.
   * After that the import/export request is rejected.
   *
   * See https://github.com/nfriedly/express-rate-limit for more options
   */
  importExportRateLimiting: { max: number, windowMs?: number } = {
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
  commitRateLimiting = {
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
  importMaxFileSize = 50 * 1024 * 1024;

  /*
   * Disable Admin UI tests
   */
  enableAdminUITests = false;

  /*
   * Enable auto conversion of pad Ids to lowercase.
   * e.g. /p/EtHeRpAd to /p/etherpad
   */
  lowerCasePadIds = false;

  randomVersionString: string|null = null;

  private initLogging = (config: any) => {
    // log4js.configure() modifies logconfig so check for equality first.
    log4js.configure(config);
    log4js.getLogger('console');

    // Overwrites for console output methods
    console.debug = this.logger.debug.bind(this.logger);
    console.log = this.logger.info.bind(this.logger);
    console.warn = this.logger.warn.bind(this.logger);
    console.error = this.logger.error.bind(this.logger);
  }

  // checks if abiword is avaiable
  abiwordAvailable = () => {
    if (this.abiword != null) {
      return os.type().indexOf('Windows') !== -1 ? 'withoutPDF' : 'yes';
    } else {
      return 'no';
    }
  };

  sofficeAvailable = () => {
    if (this.soffice != null) {
      return os.type().indexOf('Windows') !== -1 ? 'withoutPDF' : 'yes';
    } else {
      return 'no';
    }
  };

  exportAvailable = () => {
    const abiword = this.abiwordAvailable();
    const soffice = this.sofficeAvailable();

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
  getGitCommit = () => {
    let version = '';
    try {
      let rootPath = this.root;
      if (fs.lstatSync(`${rootPath}/.git`).isFile()) {
        rootPath = fs.readFileSync(`${rootPath}/.git`, 'utf8');
        rootPath = rootPath.split(' ').pop()!.trim();
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
    } catch (e: any) {
      this.logger.warn(`Can't get git version for server header\n${e.message}`);
    }
    return version;
  }

  // Return etherpad version from package.json
  getEpVersion = () => version;

  /**
   * Receives a settingsObj and, if the property name is a valid configuration
   * item, stores it in the module's exported properties via a side effect.
   *
   * This code refactors a previous version that copied & pasted the same code for
   * both "settings.json" and "credentials.json".
   */
  private storeSettings = (settingsObj: any) => {
    for (const i of Object.keys(settingsObj || {})) {
      if (this.nonSettings.includes(i)) {
        this.logger.warn(`Ignoring setting: '${i}'`);
        continue;
      }

      // test if the setting starts with a lowercase character
      if (i.charAt(0).search('[a-z]') !== 0) {
        this.logger.warn(`Settings should start with a lowercase character: '${i}'`);
      }

      // we know this setting, so we overwrite it
      // or it's a settings hash, specific to a plugin
      // @ts-ignore
      if (this[i] !== undefined || i.indexOf('ep_') === 0) {
        if (_.isObject(settingsObj[i]) && !Array.isArray(settingsObj[i])) {
          // @ts-ignore
          this[i] = _.defaults(settingsObj[i], exports[i]);
        } else {
          // @ts-ignore
          this[i] = settingsObj[i];
        }
      } else {
        // this setting is unknown, output a warning and throw it away
        this.logger.warn(`Unknown Setting: '${i}'. This setting doesn't exist or it was removed`);
      }
    }
  }



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
  private coerceValue = (stringValue: string) => {
    // cooked from https://stackoverflow.com/questions/175739/built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
    // @ts-ignore
    const isNumeric = !isNaN(stringValue) && !isNaN(parseFloat(stringValue) && isFinite(stringValue));

    if (isNumeric) {
      // detected numeric string. Coerce to a number

      return +stringValue;
    }

    switch (stringValue) {
      case 'true':
        return true;
      case 'false':
        return false;
      case 'undefined':
        return undefined;
      case 'null':
        return null;
      default:
        return stringValue;
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
  private lookupEnvironmentVariables = (obj: MapArrayType<any>) => {
    const replaceEnvs = (obj: MapArrayType<any>) => {
      for (let [key, value] of Object.entries(obj)) {
        /*
        * the first invocation of replacer() is with an empty key. Just go on, or
        * we would zap the entire object.
        */
        if (key === '') {
          obj[key] = value;
          continue
        }

        /*
         * If we received from the configuration file a number, a boolean or
         * something that is not a string, we can be sure that it was a literal
         * value. No need to perform any variable substitution.
         *
         * The environment variable expansion syntax "${ENV_VAR}" is just a string
         * of specific form, after all.
         */

        if (key === 'undefined' || value === undefined) {
          delete obj[key]
          continue
        }

        if ((typeof value !== 'string' && typeof value !== 'object') || value === null) {
          obj[key] = value;
          continue
        }

        if (typeof obj[key] === "object") {
          replaceEnvs(obj[key]);
          continue
        }


        /*
         * Let's check if the string value looks like a variable expansion (e.g.:
         * "${ENV_VAR}" or "${ENV_VAR:default_value}")
         */
        // MUXATOR 2019-03-21: we could use named capture groups here once we migrate to nodejs v10
        const match = value.match(/^\$\{([^:]*)(:((.|\n)*))?\}$/);

        if (match == null) {
          // no match: use the value literally, without any substitution
          obj[key] = value;
          continue
        }

        /*
         * We found the name of an environment variable. Let's read its actual value
         * and its default value, if given
         */
        const envVarName = match[1];
        const envVarValue = process.env[envVarName];
        const defaultValue = match[3];

        if ((envVarValue === undefined) && (defaultValue === undefined)) {
          this.logger.warn(`Environment variable "${envVarName}" does not contain any value for ` +
            `configuration key "${key}", and no default was given. Using null. ` +
            'THIS BEHAVIOR MAY CHANGE IN A FUTURE VERSION OF ETHERPAD; you should ' +
            'explicitly use "null" as the default if you want to continue to use null.');

          /*
           * We have to return null, because if we just returned undefined, the
           * configuration item "key" would be stripped from the returned object.
           */
          obj[key] = null;
          continue
        }

        if ((envVarValue === undefined) && (defaultValue !== undefined)) {
          this.logger.debug(`Environment variable "${envVarName}" not found for ` +
            `configuration key "${key}". Falling back to default value.`);

          obj[key] = this.coerceValue(defaultValue);
          continue
        }

        // envVarName contained some value.

        /*
         * For numeric and boolean strings let's convert it to proper types before
         * returning it, in order to maintain backward compatibility.
         */
        this.logger.debug(
          `Configuration key "${key}" will be read from environment variable "${envVarName}"`);

        obj[key] = this.coerceValue(envVarValue!);
      }
      return obj
    }

    replaceEnvs(obj);

    // Add plugin ENV variables

    /**
     * If the key contains a double underscore, it's a plugin variable
     * E.g.
     */
    let treeEntries = new Map<string, string | undefined>
    const root = new SettingsNode("EP")

    for (let [env, envVal] of Object.entries(process.env)) {
      if (!env.startsWith("EP")) continue
      treeEntries.set(env, envVal)
    }
    treeEntries.forEach((value, key) => {
      let pathToKey = key.split("__")
      let currentNode = root
      let depth = 0
      depth++
      currentNode.addChild(pathToKey, value!)
    })

    //console.log(root.collectFromLeafsUpwards())
    const rooting = root.collectFromLeafsUpwards()
    obj = Object.assign(obj, rooting)
    return obj;
  }



  /**
   * - reads the JSON configuration file settingsFilename from disk
   * - strips the comments
   * - replaces environment variables calling lookupEnvironmentVariables()
   * - returns a parsed Javascript object
   *
   * The isSettings variable only controls the error logging.
   */
  private parseSettings = (settingsFilename: string, isSettings: boolean) => {
    let settingsStr = '';

    let settingsType, notFoundMessage, notFoundFunction;

    if (isSettings) {
      settingsType = 'settings';
      notFoundMessage = 'Continuing using defaults!';
      notFoundFunction = this.logger.warn.bind(this.logger);
    } else {
      settingsType = 'credentials';
      notFoundMessage = 'Ignoring.';
      notFoundFunction = this.logger.info.bind(this.logger);
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

      this.logger.info(`${settingsType} loaded from: ${settingsFilename}`);

      return this.lookupEnvironmentVariables(settings);
    } catch (e: any) {
      this.logger.error(`There was an error processing your ${settingsType} ` +
        `file from ${settingsFilename}: ${e.message}`);

      process.exit(1);
    }
  }

  reloadSettings = () => {
    const settings = this.parseSettings(this.settingsFilename, true);
    const credentials = this.parseSettings(this.credentialsFilename, false);
    this.storeSettings(settings);
    this.storeSettings(credentials);

    // Init logging config
    this.logconfig = this.defaultLogConfig(this.loglevel ? this.loglevel : this.defaultLogLevel);
    this.initLogging(this.logconfig);

    if (!this.skinName) {
      this.logger.warn('No "skinName" parameter found. Please check out settings.json.template and ' +
        'update your settings.json. Falling back to the default "colibris".');
      this.skinName = 'colibris';
    }

    if (!this.socketTransportProtocols.includes("websocket") || this.socketTransportProtocols.includes("polling")) {
      this.logger.warn("Invalid socketTransportProtocols setting. Please check out settings.json.template and update your settings.json. Falling back to the default ['websocket', 'polling'].");
      this.socketTransportProtocols = ['websocket', 'polling'];
    }

    // checks if skinName has an acceptable value, otherwise falls back to "colibris"
    if (this.skinName) {
      const skinBasePath = path.join(this.root, 'src', 'static', 'skins');
      const countPieces = this.skinName.split(path.sep).length;

      if (countPieces !== 1) {
        this.logger.error(`skinName must be the name of a directory under "${skinBasePath}". This is ` +
          `not valid: "${this.skinName}". Falling back to the default "colibris".`);
        this.skinName = 'colibris';
      }

      // informative variable, just for the log messages
      let skinPath = path.join(skinBasePath, this.skinName);

      // what if someone sets skinName == ".." or "."? We catch him!
      if (isSubdir(skinBasePath, skinPath) === false) {
        this.logger.error(`Skin path ${skinPath} must be a subdirectory of ${skinBasePath}. ` +
          'Falling back to the default "colibris".');

        this.skinName = 'colibris';
        skinPath = path.join(skinBasePath, this.skinName);
      }

      if (fs.existsSync(skinPath) === false) {
        this.logger.error(`Skin path ${skinPath} does not exist. Falling back to the default "colibris".`);
        this.skinName = 'colibris';
        skinPath = path.join(skinBasePath,this.skinName);
      }

      this.logger.info(`Using skin "${this.skinName}" in dir: ${skinPath}`);
    }

    if (this.abiword) {
      // Check abiword actually exists
      if (this.abiword != null) {
        let exists = fs.existsSync(this.abiword)
        if (!exists) {
          const abiwordError = 'Abiword does not exist at this path, check your settings file.';
          if (!this.suppressErrorsInPadText) {
            this.defaultPadText += `\nError: ${abiwordError}${this.suppressDisableMsg}`;
          }
          this.logger.error(`${abiwordError} File location: ${this.abiword}`);
          this.abiword = null;
        }
      }
    }

    if (this.soffice) {
      let exists = fs.existsSync(this.soffice)
      if (!exists) {
        const sofficeError =
          'soffice (libreoffice) does not exist at this path, check your settings file.';

        if (!this.suppressErrorsInPadText) {
          this.defaultPadText += `\nError: ${sofficeError}${this.suppressDisableMsg}`;
        }
        this.logger.error(`${sofficeError} File location: ${this.soffice}`);
        this.soffice = null;
      }
    }

    const sessionkeyFilename = makeAbsolute(argvP.sessionkey || './SESSIONKEY.txt');
    if (!this.sessionKey) {
      try {
        this.sessionKey = fs.readFileSync(sessionkeyFilename, 'utf8');
        this.logger.info(`Session key loaded from: ${sessionkeyFilename}`);
      } catch (err) { /* ignored */
      }
      const keyRotationEnabled = this.cookie.keyRotationInterval && this.cookie.sessionLifetime;
      if (!this.sessionKey && !keyRotationEnabled) {
        this.logger.info(
          `Session key file "${sessionkeyFilename}" not found. Creating with random contents.`);
        this.sessionKey = randomString(32);
        fs.writeFileSync(sessionkeyFilename, this.sessionKey, 'utf8');
      }
    } else {
      this.logger.warn('Declaring the sessionKey in the settings.json is deprecated. ' +
        'This value is auto-generated now. Please remove the setting from the file. -- ' +
        'If you are seeing this error after restarting using the Admin User ' +
        'Interface then you can ignore this message.');
    }
    if (this.sessionKey) {
      this.logger.warn(`The sessionKey setting and ${sessionkeyFilename} file are deprecated; ` +
        'use automatic key rotation instead (see the cookie.keyRotationInterval setting).');
    }

    if (this.dbType === 'dirty') {
      const dirtyWarning = 'DirtyDB is used. This is not recommended for production.';
      if (!this.suppressErrorsInPadText) {
        this.defaultPadText += `\nWarning: ${dirtyWarning}${this.suppressDisableMsg}`;
      }

      this.dbSettings.filename = makeAbsolute(this.dbSettings.filename);
      this.logger.warn(`${dirtyWarning} File location: ${this.dbSettings.filename}`);
    }

    if (this.ip === '') {
      // using Unix socket for connectivity
      this.logger.warn('The settings file contains an empty string ("") for the "ip" parameter. The ' +
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
    this.randomVersionString = randomString(4);
    this.logger.info(`Random string used for versioning assets: ${this.randomVersionString}`);
  };
}
const settings = new Settings()

export default settings



