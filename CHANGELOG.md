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
 * Fix: Import <ol>'s  as <ol>'s and not as <ul>'s!
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
