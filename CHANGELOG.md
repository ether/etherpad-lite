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
