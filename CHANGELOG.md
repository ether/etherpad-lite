# 1.3
 * NEW: We now follow the semantic versioning scheme!
 * NEW: Option to disable IP logging
 * NEW: Localisation updates from http://translatewiki.net. 
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
