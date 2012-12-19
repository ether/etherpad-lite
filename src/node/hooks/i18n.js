var languages = require('languages4translatewiki')
  , fs = require('fs')
  , path = require('path')
  , express = require('express')
  , _ = require('underscore')
  , npm = require('npm')
;

/*
* PRIVATE
*/

// locales will store all locales ini files merged (core+plugins) in RAM
var locales = {};

//explore recursive subdirectories from root and execute callback
//don't explore symbolic links
var exploreDir = function (root, callback) {
  var stat = fs.lstatSync(root);
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    var names = fs.readdirSync(root),
    subdirs = [],
    files = [];
    names.forEach (function(file) {
      file = path.resolve(root,file);
      stat = fs.lstatSync(file);
      if (stat.isDirectory() && !stat.isSymbolicLink()) {
        subdirs.push(file);
      } else {
        files.push(file);
      }
    });
    callback(root, subdirs, files);
    subdirs.forEach(function (d) {
      exploreDir(d, callback);
    });
  }
};

// return all files languages absolute path group by langcode
// {es: [pathcore, pathplugin1...], en:...}
var getAllLocalesPaths = function () {
  var result = {};

  //extract only files paths with name is a supported language code and have json extension
  var extractLangs = function (root, subdirs, files) {
    _.each(files, function(file) {
      var ext = path.extname(file),
      locale = path.basename(file, ext).toLowerCase();
      if ((ext == '.json') && languages.isValid(locale)) {
        if (!(_.has(result, locale))) result[locale] = [];
        result[locale].push(file);
      }
    });
  }

  //add core supported languages first
  exploreDir (npm.root+"/ep_etherpad-lite/locales", extractLangs);
  
  //add plugins languages (if any) -- bad practice
  exploreDir (npm.root, extractLangs);

  return result;
}

//save in locales all json files merged by language code
var getAllLocales = function () {
  _.each (getAllLocalesPaths(), function(files, langcode) {
    locales[langcode]={}
    _.each (files, function(file) {
      _.extend(locales[langcode], JSON.parse(fs.readFileSync(file,'utf8'))[langcode]);
    });
  });
}

//return all languages availables with nativeName and direction
//{es: {nativeName: "español", direction: "ltr"},...}
var getAvailableLangs = function () {
  var result = {};
  if (_.isEmpty(locales)) getAllLocales();
  _.each(_.keys(locales), function(langcode) {
    result[langcode]=languages.getLanguageInfo(langcode);
  });
  return result;
}

//return locale index that will be served in /locales.json
var generateLocaleIndex = function () {
  if (_.isEmpty(locales)) getAllLocales();
  var result = _.clone(locales);
  _.each(_.keys(locales), function(langcode) {
    if (langcode != 'en') result[langcode]='/locales/'+langcode+'.json';
  });
  return JSON.stringify(result);
}


/*
* PUBLIC
*/

exports.expressCreateServer = function(n, args) {

  //regenerate locales when server restart
  locales = {};
  var localeIndex = generateLocaleIndex();
  exports.availableLangs = getAvailableLangs();

  args.app.get ('/locales/:locale', function(req, res) {
    //works with /locale/en and /locale/en.json requests
    var locale = req.params.locale.split('.')[0];
    if (exports.availableLangs.hasOwnProperty(locale)) {
      // Don't include utf8 encoding (see https://forum.jquery.com/topic/the-problem-with-ie8-and-encoding-error-c00ce56e)
      res.setHeader('Content-Type', 'application/json');
      res.send('{"'+locale+'":'+JSON.stringify(locales[locale])+'}');
    } else {
      res.send(404, 'Language not available');
    }
  })
  
  args.app.get('/locales.json', function(req, res) {
    res.setHeader('Content-Type', 'application/json');// don't send encoding (see above)
    res.send(localeIndex);
  })
  
}

