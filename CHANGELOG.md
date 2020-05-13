# 1.8.3
* FEATURE: colibris is now the default skin for new installs
* FEATURE: improved colibris visuals, and migrated to Flexbox layout
* FEATURE: skin variants: colibris skin colors can be easily customized. Visit http://127.0.0.1:9001/p/test#skinvariantsbuilder
* REQUIREMENTS: minimum required Node version is **10.13.0 LTS**.
* MINOR: stability fixes for the async migration in 1.8.0 (fixed many UnhandledPromiseRejectionWarning and the few remaining crashes)
* MINOR: improved stability of import/export functionality
* MINOR: fixed many small UI quirks (timeslider, import/export, chat)
* MINOR: Docker images are now built & run in production mode by default
* MINOR: reduced the size of the Docker images
* MINOR: better documented cookies and configuration parameters of the Docker image
* MINOR: better database support (especially MySQL)
* MINOR: additional test coverage
* MINOR: restored compatibility with ep_hash_auth
* MINOR: migrate from swagger-node-express to openapi-backend
* MINOR: honor the Accept-Language HTTP headers sent by browsers, eventually serving language variants
* PERFORMANCE: correctly send HTTP/304 for minified files
* SECURITY: bumped many dependencies. At the time of the release, this version has 0 reported vulnerabilities by npm audit
* SECURITY: never send referrer when opening a link
* SECURITY: rate limit imports and exports
* SECURITY: do not allow pad import if a user never contributed to that pad
* SECURITY: expose configuration parameter for limiting max import size

*BREAKING CHANGE*: undoing the "clear authorship colors" command is no longer supported (see https://github.com/ether/etherpad-lite/issues/2802)
*BREAKING CHANGE*: the visuals and CSS structure of the page was updated. Plugins may need a CSS rehaul

# 1.8
* SECURITY: change referrer policy so that Etherpad addresses aren't leaked when links are clicked (discussion: https://github.com/ether/etherpad-lite/pull/3636)
* SECURITY: set the "secure" flag for the session cookies when served over SSL. From now on it will not be possible to serve the same instance both in cleartext and over SSL

# 1.8-beta.1
* FEATURE: code was migrated to `async`/`await`, getting rid of a lot of callbacks (see https://github.com/ether/etherpad-lite/issues/3540)
* FEATURE: support configuration via environment variables
* FEATURE: include an official Dockerfile in the main repository
* FEATURE: support including plugins in custom Docker builds
* FEATURE: conditional creation of users: when its password is null, a user is not created. This helps, for example, in advanced configuration of Docker images.
* REQUIREMENTS: minimum required Node version is **8.9.0 LTS**. Release 1.8.3 will require at least Node **10.13.0** LTS
* MINOR: in the HTTP API, allow URL parameters and POST bodies to co-exist
* MINOR: fix Unicode bug in HTML export
* MINOR: bugfixes to colibris chat window
* MINOR: code simplification (avoided double negations, introduced early exits, ...)
* MINOR: reduced the size of the Windows package
* MINOR: upgraded the nodejs runtime to 10.16.3 in the Windows package
* SECURITY: avoided XSS in IE11
* SECURITY: the version is exposed in http header only when configured
* SECURITY: updated vendored jQuery version
* SECURITY: bumped dependencies

# 1.7.5
* FEATURE: introduced support for multiple skins. See https://etherpad.org/doc/v1.7.5/#index_skins
* FEATURE: added a new, optional skin. It can be activated choosing `skinName: "colibris"` in `settings.json`
* FEATURE: allow file import using LibreOffice
* SECURITY: updated many dependencies. No known high or moderate risk dependencies remain.
* SECURITY: generate better random pad names
* FIX: don't nuke all installed plugins if `npm install` fails
* FIX: improved LibreOffice export
* FIX: allow debug mode on node versions >= 6.3
* MINOR: started making Etherpad less dependent on current working directory when running
* MINOR: started simplifying the code structure, flattening complex conditions
* MINOR: simplified a bit the startup scripts

*UPGRADE NOTES*: if you have custom files in `src/static/custom`, save them
somewhere else, revert the directory contents, update to Etherpad 1.7.5, and
finally put them back in their new location, uder `src/static/skins/no-skin`.

# 1.7.0
* FIX: `getLineHTMLForExport()` no longer produces multiple copies of a line. **WARNING**: this could potentially break some plugins
* FIX: authorship of bullet points no longer changes when a second author edits them
* FIX: improved Firefox compatibility (non printable keys)
* FIX: `getPadPlainText()` was not working
* REQUIREMENTS: minimum required Node version is 6.9.0 LTS. The next release will require at least Node 8.9.0 LTS
* SECURITY: updated MySQL, Elasticsearch and PostgreSQL drivers
* SECURITY: started updating deprecated code and packages
* DOCS: documented --credentials, --apikey, --sessionkey. Better detailed contributors guidelines. Added a section on securing the installation

# 1.6.6
 * FIX: line numbers are aligned with text again (broken in 1.6.4)
 * FIX: text entered between connection loss and reconnection was not saved
 * FIX: diagnostic call failed when etherpad was exposed in a subdirectory

# 1.6.5
 * SECURITY: Escape data when listing available plugins
 * FIX: Fix typo in apicalls.js which prevented importing isValidJSONPName
 * FIX: fixed plugin dependency issue
 * FIX: Update iframe_editor.css
 * FIX: unbreak Safari iOS line wrapping

# 1.6.4
 * SECURITY: Access Control bypass on /admin - CVE-2018-9845
 * SECURITY: Remote Code Execution through pad export - CVE-2018-9327
 * SECURITY: Remote Code Execution through JSONP handling - CVE-2018-9326
 * SECURITY: Pad data leak - CVE-2018-9325
 * Fix: Admin redirect URL
 * Fix: Various script Fixes
 * Fix: Various CSS/Style/Layout fixes
 * NEW: Improved Pad contents readability
 * NEW: Hook: onAccessCheck
 * NEW: SESSIONKEY and APIKey customizable path
 * NEW: checkPads script
 * NEW: Support "cluster mode"

# 1.6.3
 * SECURITY: Update ejs
 * SECURITY: xss vulnerability when reading window.location.href
 * SECURITY: sanitize jsonp
 * NEW: Catch SIGTERM for graceful shutdown
 * NEW: Show actual applied text formatting for caret position
 * NEW: Add settings to improve scrolling of viewport on line changes

# 1.6.2
 * NEW: Added pad shortcut disabling feature
 * NEW: Create option to automatically reconnect after a few seconds
 * Update: socket.io to 1.7.3
 * Update: l10n lib
 * Update: request to 2.83.0
 * Update: Node for windows to 8.9.0
 * Fix: minification of code

# 1.6.1
 * NEW: Hook aceRegisterNonScrollableEditEvents to register events that shouldn't scroll
 * NEW: Added 'item' parameter to registerAceCommand Hook
 * NEW: Added LibreJS support
 * Fix: Crash on malformed export url
 * Fix: Re-enable editor after user is reconnected to server
 * Fix: minification
 * Other: Added 'no-referrer' for all pads
 * Other: Improved cookie security
 * Other: Fixed compatibility with nodejs 7
 * Other: Updates
  - socket.io to 1.6.0
  - express to 4.13.4
  - express-session to 1.13.0
  - clean-css to 3.4.12
  - uglify-js to 2.6.2
  - log4js to 0.6.35
  - cheerio to 0.20.0
  - ejs to 2.4.1
  - graceful-fs to 4.1.3
  - semver to 5.1.0
  - unorm to 1.4.1
  - jsonminify to 0.4.1
  - measured to 1.1.0
  - mocha to 2.4.5
  - supertest to 1.2.0
  - npm to 4.0.2
  - Node.js for Windows to 6.9.2

# 1.6.0
 * SECURITY: Fix a possible xss attack in iframe link
 * NEW: Add a aceSelectionChanged hook to allow plugins to react when the cursor location changes.
 * NEW: Accepting Arrays on 'exportHtmlAdditionalTags' to handle attributes stored as ['key', 'value']
 * NEW: Allow admin to run on a sub-directory
 * NEW: Support version 5 of node.js
 * NEW: Update windows build to node version 4.4.3
 * NEW: Create setting to control if a new line will be indented or not
 * NEW: Add an appendText API
 * NEW: Allow LibreOffice to be used when exporting a pad
 * NEW: Create hook exportHtmlAdditionalTagsWithData
 * NEW: Improve DB migration performance
 * NEW: allow settings to be applied from the filesystem
 * NEW: remove applySettings hook and allow credentials.json to be part of core
 * NEW: Use exec to switch to node process
 * NEW: Validate incoming color codes
 * Fix: Avoid space removal when pasting text from word processor.
 * Fix: Removing style that makes editor scroll to the top on iOS without any action from the user
 * Fix: Fix API call appendChatMessage to send new message to all connected clients
 * Fix: Timeslider "Return to pad" button
 * Fix: Generating pad HTML with tags like <span data-TAG="VALUE"> instead of <TAG:VALUE>
 * Fix: Get git commit hash even if the repo only points to a bare repo.
 * Fix: Fix decode error if pad name contains special characters and is sanitized
 * Fix: Fix handleClientMessage_USER_* payloads not containing user info
 * Fix: Set language cookie on initial load
 * Fix: Timeslider Not Translated
 * Other: set charset for mysql connection in settings.json
 * Other: Dropped support for io.js
 * Other: Add support to store credentials in credentials.json
 * Other: Support node version 4 or higher
 * Other: Update uberDB to version 0.3.0

# 1.5.7
 * NEW: Add support for intermediate CA certificates for ssl
 * NEW: Provide a script to clean up before running etherpad
 * NEW: Use ctrl+shift+1 to do a ordered list
 * NEW: Show versions of plugins on startup
 * NEW: Add author on padCreate and padUpdate hook
 * Fix: switchToPad method
 * Fix: Dead keys
 * Fix: Preserve new lines in copy-pasted text
 * Fix: Compatibility mode on IE
 * Fix: Content Collector to get the class of the DOM-node
 * Fix: Timeslider export links
 * Fix: Double prompt on file upload
 * Fix: setText() replaces the entire pad text
 * Fix: Accessibility features on embedded pads
 * Fix: Tidy HTML before abiword conversion
 * Fix: Remove edit buttons in read-only view
 * Fix: Disable user input in read-only view
 * Fix: Pads end with a single newline, rather than two newlines
 * Fix: Toolbar and chat for mobile devices

# 1.5.6
 * Fix: Error on windows installations

# 1.5.5
 * SECURITY: Also don't allow read files on directory traversal on minify paths
 * NEW: padOptions can be set in settings.json now
 * Fix: Add check for special characters in createPad API function
 * Fix: Middle click on a link in firefox don't paste text anymore
 * Fix: Made setPadRaw async to import larger etherpad files
 * Fix: rtl
 * Fix: Problem in older IEs
 * Other: Update to express 4.x
 * Other: Dropped support for node 0.8
 * Other: Update ejs to version 2.x
 * Other: Moved sessionKey from settings.json to a new auto-generated SESSIONKEY.txt file

# 1.5.4
 * SECURITY: Also don't allow read files on directory traversal on frontend tests path

# 1.5.3
 * NEW: Accessibility support for Screen readers, includes new fonts and keyboard shortcuts
 * NEW: API endpoint for Append Chat Message and Chat Backend Tests
 * NEW: Error messages displayed on load are included in Default Pad Text (can be supressed)
 * NEW: Content Collector can handle key values
 * NEW: getAttributesOnPosition Method
 * FIX: Firefox keeps attributes (bold etc) on cut/copy -> paste
 * Fix: showControls=false now works
 * Fix: Cut and Paste works...
 * SECURITY: Don't allow read files on directory traversal

# 1.5.2
 * NEW: Support for node version 0.12.x
 * NEW: API endpoint saveRevision, getSavedRevisionCount and listSavedRevisions
 * NEW: setting to allow load testing
 * Fix: Rare scroll issue
 * Fix: Handling of custom pad path
 * Fix: Better error handling of imports and exports of type "etherpad"
 * Fix: Walking caret in chrome
 * Fix: Better handling for changeset problems
 * SECURITY Fix: Information leak for etherpad exports (CVE-2015-2298)

# 1.5.1
 * NEW: High resolution Icon
 * NEW: Use HTTPS for plugins.json download
 * NEW: Add 'last update' column
 * NEW: Show users and chat at the same time
 * NEW: Support io.js
 * Fix: removeAttributeOnLine now works properly
 * Fix: Plugin search and list
 * Fix: Issue where unauthed request could cause error
 * Fix: Privacy issue with .etherpad export
 * Fix: Freeze deps to improve bisectability
 * Fix: IE, everything. IE is so broken.
 * Fix: Timeslider proxy
 * Fix: All backend tests pass
 * Fix: Better support for Export into HTML
 * Fix: Timeslider stars
 * Fix: Translation update
 * Fix: Check filesystem if Abiword exists
 * Fix: Docs formatting
 * Fix: Move Save Revision notification to a gritter message
 * Fix: UeberDB MySQL Timeout issue
 * Fix: Indented +9 list items
 * Fix: Don't paste on middle click of link
 * SECURITY Fix: Issue where a malformed URL could cause EP to disclose installation location

# 1.5.0
 * NEW: Lots of performance improvements for page load times
 * NEW: Hook for adding CSS to Exports
 * NEW: Allow shardable socket io
 * NEW: Allow UI to show when attr/prop is applied (CSS)
 * NEW: Various scripts
 * NEW: Export full fidelity pads (including authors etc.)
 * NEW: Various front end tests
 * NEW: Backend tests
 * NEW: switchPad hook to instantly switch between pads
 * NEW: Various translations
 * NEW: Icon sets instead of images to provide quality high DPI experience
 * Fix: HTML Import blocking / hanging server
 * Fix: Export Bullet / Numbered lists HTML
 * Fix: Swagger deprecated warning
 * Fix: Bad session from crashing server
 * Fix: Allow relative settings path
 * Fix: Stop attributes being improperly assigned between 2 lines
 * Fix: Copy / Move Pad API race condition
 * Fix: Save all user preferences
 * Fix: Upgrade majority of dependency inc upgrade to SocketIO1+
 * Fix: Provide UI button to restore maximized chat window
 * Fix: Timeslider UI Fix
 * Fix: Remove Dokuwiki
 * Fix: Remove long paths from windows build (stops error during extract)
 * Fix: Various globals remvoed
 * Fix: Move all scripts into bin/
 * Fix: Various CSS bugfixes for Mobile devices
 * Fix: Overflow Toolbar
 * Fix: Line Attribute management

# 1.4.1
 * NEW: Translations
 * NEW: userLeave Hook
 * NEW: Script to reinsert all DB values of a Pad
 * NEW: Allow for absolute settings paths
 * NEW: API: Get Pad ID from read Only Pad ID
 * NEW: Huge improvement on MySQL database read/write (InnoDB to MyISAM)
 * NEW: Hook for Export File Name
 * NEW: Preprocessor Hook for DOMLine attributes (allows plugins to wrap entire line contents)
 * Fix: Exception on Plugin Search and fix for plugins not being fetched
 * Fix: Font on innerdoc body can be arial on paste
 * Fix: Fix Dropping of messages in handleMessage
 * Fix: Don't use Abiword for HTML exports
 * Fix: Color issues with user Icon
 * Fix: Timeslider Button
 * Fix: Session Deletion error
 * Fix: Allow browser tabs to be cycled when focus is in editor
 * Fix: Various Editor issues with Easysync potentially entering forever loop on bad changeset

# 1.4
 * NEW: Disable toolbar items through settings.json
 * NEW: Internal stats/metrics engine
 * NEW: Copy/Move Pad API functions
 * NEW: getAttributeOnSelection method
 * NEW: CSS function when an attribute is active on caret location
 * NEW: Various new eejs blocks
 * NEW: Ace afterEditHook
 * NEW: Import hook to introduce alternative export methods
 * NEW: preProcessDomLine allows Domline attributes to be processed before native attributes
 * Fix: Allow for lighter author colors
 * Fix: Improved randomness of session tokens
 * Fix: Don't panic if an author2session/group2session no longer exists
 * Fix: Gracefully fallback to related languages if chosen language is unavailable
 * Fix: Various changeset/stability bugs
 * Fix: Re-enable import buttons after failed import
 * Fix: Allow browser tabs to be cycled when in editor
 * Fix: Better Protocol detection
 * Fix: padList API Fix
 * Fix: Caret walking issue
 * Fix: Better settings.json parsing
 * Fix: Improved import/export handling
 * Other: Various whitespace/code clean-up
 * Other: .deb packaging creator
 * Other: More API Documentation
 * Other: Lots more translations
 * Other: Support Node 0.11

# 1.3
 * NEW: We now follow the semantic versioning scheme!
 * NEW: Option to disable IP logging
 * NEW: Localisation updates from https://translatewiki.net.
 * Fix: Fix readOnly group pads
 * Fix: don't fetch padList on every request

# 1.2.12
 * NEW: Add explanations for more disconnect scenarios
 * NEW: export sessioninfos so plugins can access it
 * NEW: pass pad in postAceInit hook
 * NEW: Add trustProxy setting. ALlows to make ep use X-forwarded-for as remoteAddress
 * NEW: userLeave hook (UNDOCUMENTED)
 * NEW: Plural macro for translations
 * NEW: backlinks to main page in Admin pages
 * NEW: New translations from translatewiki.net
 * SECURITY FIX: Filter author data sent to clients
 * FIX: Never keep processing a changeset if it's corrupted
 * FIX: Some client-side performance fixes for webkit browsers
 * FIX: Only execute listAllPads query on demand (not on start-up)
 * FIX: HTML import (don't crash on malformed or blank HTML input; strip title out of html during import)
 * FIX: check if uploaded file only contains ascii chars when abiword disabled
 * FIX: Plugin search in /admin/plugins
 * FIX: Don't create new pad if a non-existant read-only pad is accessed
 * FIX: Drop messages from unknown connections (would lead to a crash after a restart)
 * FIX: API: fix createGroupFor endpoint, if mapped group is deleted
 * FIX: Import form for other locales
 * FIX: Don't stop processing changeset queue if there is an error
 * FIX: Caret movement. Chrome detects blank rows line heights as incorrect
 * FIX: allow colons in password
 * FIX: Polish logging of client-side errors on the server
 * FIX: Username url param
 * FIX: Make start script POSIX ompatible


# 1.2.11
 * NEW: New Hook for outer_ace dynamic css manager and author style hook
 * NEW: Bump log4js for improved logging
 * Fix: Remove URL schemes which don't have RFC standard
 * Fix: Fix safeRun subsequent restarts issue
 * Fix: Allow safeRun to pass arguements to run.sh
 * Fix: Include script for more efficient import
 * Fix: Fix sysv comptibile script
 * Fix: Fix client side changeset spamming
 * Fix: Don't crash on no-auth
 * Fix: Fix some IE8 errors
 * Fix: Fix authorship sanitation

# 1.2.10
 * NEW: Broadcast slider is exposed in timeslider so plugins can interact with it
 * Fix: IE issue where pads wouldn't load due to missing console from i18n
 * Fix: console issue in collab client would error on cross domain embeds in IE
 * Fix: Only Restart Etherpad once plugin is installed
 * Fix: Only redraw lines that exist after drag and drop
 * Fix: Pasting into ordered list
 * Fix: Import browser detection
 * Fix: 2 Part Locale Specs
 * Fix: Remove language string from chat element
 * Fix: Make Saved revision Star fade back out on non Top frames
 * Other: Remove some cruft legacy JS from old Etherpad
 * Other: Express 3.1.2 breaks sessions, set Express to 3.1.0

# 1.2.91
 * NEW: Authors can now send custom object messages to other Authors making 3 way conversations possible.  This introduces WebRTC plugin support.
 * NEW: Hook for Chat Messages Allows for Desktop Notification support
 * NEW: FreeBSD installation docs
 * NEW: Ctrl S for save revision makes the Icon glow for a few sconds.
 * NEW: Various hooks and expose the document ACE object
 * NEW: Plugin page revamp makes finding and installing plugins more sane.
 * NEW: Icon to enable sticky chat from the Chat box
 * Fix: Cookies inside of plugins
 * Fix: Don't leak event emitters when accessing admin/plugins
 * Fix: Don't allow user to send messages after they have been "kicked" from a pad
 * Fix: Refactor Caret navigation with Arrow and Pageup/down keys stops cursor being lost
 * Fix: Long lines in Firefox now wrap properly
 * Fix: Session Disconnect limit is increased from 10 to 20 to support slower restarts
 * Fix: Support Node 0.10
 * Fix: Log HTTP on DEBUG log level
 * Fix: Server wont crash on import fails on 0 file import.
 * Fix: Import no longer fails consistantly
 * Fix: Language support for non existing languages
 * Fix: Mobile support for chat notifications are now usable
 * Fix: Re-Enable Editbar buttons on reconnect
 * Fix: Clearing authorship colors no longer disconnects all clients
 * Other: New debug information for sessions

# 1.2.9
 * Fix: MAJOR Security issue, where a hacker could submit content as another user
 * Fix: security issue due to unescaped user input
 * Fix: Admin page at /admin redirects to /admin/ now to prevent breaking relative links
 * Fix: indentation in chrome on linux
 * Fix: PadUsers API endpoint
 * NEW: A script to import data to all dbms
 * NEW: Add authorId to chat and userlist as a data attribute
 * NEW: Refactor and fix our frontend tests
 * NEW: Localisation updates


# 1.2.81
 * Fix: CtrlZ-Y for Undo Redo
 * Fix: RTL functionality on contents & fix RTL/LTR tests and RTL in Safari
 * Fix: Various other tests fixed in Android

# 1.2.8
 ! IMPORTANT: New setting.json value is required to automatically reconnect clients on disconnect
 * NEW: Use Socket IO for rooms (allows for pads to be load balanced with sticky rooms)
 * NEW: Plugins can now provide their own frontend tests
 * NEW: Improved server-side logging
 * NEW: Admin dashboard mobile device support and new hooks for Admin dashboard
 * NEW: Get current API version from API
 * NEW: CLI script to delete pads
 * Fix: Automatic client reconnection on disonnect
 * Fix: Text Export indentation now supports multiple indentations
 * Fix: Bugfix getChatHistory API method
 * Fix: Stop Chrome losing caret after paste is texted
 * Fix: Make colons on end of line create 4 spaces on indent
 * Fix: Stop the client disconnecting if a rev is in the wrong order
 * Fix: Various server crash issues based on rev in wrong order
 * Fix: Various tests
 * Fix: Make indent when on middle of the line stop creating list
 * Fix: Stop long strings breaking the UX by moving focus away from beginning of line
 * Fix: Redis findKeys support
 * Fix: padUsersCount no longer hangs server
 * Fix: Issue with two part locale specs not working
 * Fix: Make plugin search case insensitive
 * Fix: Indentation and bullets on text export
 * Fix: Resolve various warnings on dependencies during install
 * Fix: Page up / Page down now works in all browsers
 * Fix: Stop Opera browser inserting two new lines on enter keypress
 * Fix: Stop timeslider from showing NaN on pads with only one revision
 * Other: Allow timeslider tests to run and provide & fix various other frontend-tests
 * Other: Begin dropping referene to Lite.  Etherpad Lite is now named "Etherpad"
 * Other: Update to latest jQuery
 * Other: Change loading message asking user to please wait on first build
 * Other: Allow etherpad to use global npm installation (Safe since node 6.3)
 * Other: Better documentation for log rotation and log message handling



# 1.2.7
 * NEW: notifications are now modularized and can be stacked
 * NEW: Visit a specific revision in the timeslider by suffixing #%revNumber% IE http://localhost/p/test/timeslider#12
 * NEW: Link to plugin on Admin page allows admins to easily see plugin details in a new window by clicking on the plugin name
 * NEW: Automatically see plugins that require update and be able to one click update
 * NEW: API endpoints for Chat .. getChatHistory, getChatHead
 * NEW: API endpoint to see a pad diff in HTML format from revision x to revision y .. createPadDiffHTML
 * NEW: Real time plugin search & unified menu UI for admin pages
 * Fix: MAJOR issue where server could be crashed by malformed client message
 * Fix: AuthorID is now included in padUsers API response
 * Fix: make docs
 * Fix: Timeslider UI bug with slider not being in position
 * Fix: IE8 language issue where it wouldn't load pads due to IE8 suckling on the bussum of hatrid
 * Fix: Import timeout issue
 * Fix: Import now works if Params are set in pad URL
 * Fix: Convert script
 * Other: Various new language strings and update/bugfixes of others
 * Other: Clean up the getParams functionality
 * Other: Various new EEJS blocks: index, timeslider, html etc.

# 1.2.6
 * Fix: Package file UeberDB reference
 * New #users EEJS block for plugins

# 1.2.5
 * Create timeslider EEJS blocks for plugins
 * Allow for "more messages" to be loaded in chat
 * Introduce better logging
 * API endpoint for "listAllPads"
 * Fix: Stop highlight of timeslider when dragging mouse
 * Fix: Time Delta on Timeslider make date update properly
 * Fix: Prevent empty chat messages from being sent
 * Fix: checkPad script
 * Fix: IE onLoad listener for i18n

# 1.2.4
 * Fix IE console issue created in 1.2.3
 * Allow CI Tests to pass by ignoring timeslider test
 * Fix broken placeholders in locales
 * Fix extractPadData script
 * Fix documentation for checkToken
 * Fix hitting enter on form in admin/plugins

# 1.2.3
 * Fix #1307: Chrome needs console.log to be called on console obj
 * Fix #1309: We had broken support for node v0.6 in the last release

# 1.2.2
 * More translations and better language support.  See https://translatewiki.net/wiki/Translating:Etherpad_lite for more details
 * Add a checkToken Method to the API
 * Bugfix for Internal Caching issue that was causing some 404s on images.
 * Bugfix for IE Import
 * Bugfix for Node 0.6 compatibility
 * Bugfix for multiple cookie support
 * Bugfix for API when requireAuth is enabled.
 * Plugin page now shows plugin version #
 * Show color of Author in Chat messages
 * Allow plugin search by description
 * Allow for different socket IO transports
 * Allow for custom favicon path
 * Control S now does Create new Revision functionality
 * Focus on password when required
 * Frontend Timeslider test
 * Allow for basic HTML etc. import without abiword
 * Native HTTPS support

# 1.2.1
 * Allow ! in urls inside the editor (Not Pad urls)
 * Allow comments in language files
 * More languages (Finish, Spanish, Bengali, Dutch) Thanks to TranslateWiki.net team.  See https://translatewiki.net/w/i.php?title=Special:MessageGroupStats&group=out-etherpad-lite for more details
 * Bugfix for IE7/8 issue with a JS error #1186
 * Bugfix windows package extraction issue and make the .zip file smaller
 * Bugfix group pad API export
 * Kristen Stewart is a terrible actress and Twilight sucks.

# v1.2
 * Internationalization / Language / Translation support (i18n) with support for German/French
 * A frontend/client side testing framework and backend build tests
 * Customizable robots.txt
 * Customizable app title (finally you can name your epl instance!)
 * eejs render arguments are now passed on to eejs hooks through the newly introduced `renderContext` argument.
 * Plugin-specific settings in settings.json (finally allowing for things like a google analytics plugin)
 * Serve admin dashboard at /admin (still very limited, though)
 * Modify your settings.json through the newly created UI at /admin/settings
 * Fix: Import `<ol>` as `<ol>` and not as `<ul>`!
 * Added solaris compatibility (bin/installDeps.sh was broken on solaris)
 * Fix a bug with IE9 and Password Protected Pads using HTTPS

# v1.1.5
 * We updated to express v3 (please [make sure](https://github.com/visionmedia/express/wiki/Migrating-from-2.x-to-3.x) your plugin works under express v3)
 * `userColor` URL parameter which sets the initial author color
 * Hooks for "padCreate", "padRemove", "padUpdate" and "padLoad" events
 * Security patches concerning the handling of messages originating from clients
 * Our database abstraction layer now natively supports couchDB, levelDB, mongoDB, postgres, and redis!
 * We now provide a script helping you to migrate from dirtyDB to MySQL
 * Support running Etherpad Lite behind IIS, using [iisnode](https://github.com/tjanczuk/iisnode/wiki)
 * LibreJS Licensing information in headers of HTML templates
 * Default port number to PORT env var, if port isn't specified in settings
 * Fix for `convert.js`
 * Raise upper char limit in chat to 999 characters
 * Fixes for mobile layout
 * Fixes for usage behind reverse proxy
 * Improved documentation
 * Fixed some opera style bugs
 * Update npm and fix some bugs, this introduces

# v1.1
* Introduced Plugin framework
* Many bugfixes
* Faster page loading
* Various UI polishes
* Saved Revisions
* Read only Real time view
* More API functionality

# v 1.0.1

* Updated MySQL driver, this fixes some problems with mysql
* Fixed export,import and timeslider link when embed parameters are used
