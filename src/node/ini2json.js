/*
 * THIS FILE IS ONLY FOR TESTING
 */

/*
* REQUIRE MODULES
*/
var languages = require('languages4translatewiki')
  , fs = require('fs')
  , path = require('path')
  , _ = require('underscore');

/*
* PRIVATE
*/

// locales will store all locales ini files merged (core+plugins) in RAM
var locales = {};

// convert an ini file string (input) to JSON {key: value, key2: value2...}
var parseIni = function (input) {
  var result = {},
  lines = input.split('\n');
  _.each (lines, function(line) {
    line = line.trim();
    if ((line.length > 0) && (line[0] != ';') && (line[0] != '[')) {
      line = line.split('=', 2);
      if (line.length == 2) result[line[0].trim()]=line[1].trim();
    }	
  });
  return result;
}

// convert JSON obj {key: value, key2: value2...} to ini file string
var generateIni = function (obj, section) {
  //english by default
  if (section == 'en') section = '*';
  var result = "["+section+"]\n";
  _.each (obj, function(value, key) {
    result += key+" = "+value+"\n";
  });
  return result;
}

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

  //extract only files paths with name is a supported language code and have ini extension
  var extractLangs = function (root, subdirs, files) {
    _.each(files, function(file) {
      var ext = path.extname(file),
      locale = path.basename(file, ext).toLowerCase();
      if ((ext == '.ini') && languages.isValid(locale)) {
        if (!(_.has(result, locale))) result[locale] = [];
        result[locale].push(file);
      }
    });
  }

  //add core supported languages first
  var root = path.resolve(__dirname+"/../locales");
  exploreDir (root, extractLangs);
  //add plugins languages (if any)
  //root = path.resolve(__dirname+"/../../node_modules");
  //exploreDir (root, extractLangs);

  return result;
}

//save in locales all ini files merged by language code
var getAllLocales = function () {
  _.each (getAllLocalesPaths(), function(files, langcode) {
    locales[langcode]={}
    _.each (files, function(file) {
      _.extend(locales[langcode], parseIni(fs.readFileSync(file,'utf8')));
    });
    //locales[langcode] = generateIni(locales[langcode], langcode);
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

//return locale index that will be served in /locales.ini
var generateLocaleIndex = function () {
  var result = '';
  if (_.isEmpty(locales)) getAllLocales();
  result += locales['en']+"\n";
  _.each(_.keys(locales), function(langcode) {
    if (langcode != 'en') result+='['+langcode+']\n@import url(locales/'+langcode+'.ini)\n';
  });
  return result;
}

var generateLocaleIndexJSON = function () {
  if (_.isEmpty(locales)) getAllLocales();
  var result = locales;
  //result += locales['en']+"\n";
  _.each(_.keys(locales), function(langcode) {
    if (langcode != 'en') result[langcode]='/locales/'+langcode+'.json';
  });
  return JSON.stringify(result);
}

var root = path.resolve(__dirname+"/../locales");

getAllLocales();

_.each(locales, function(translation, langcode) {
  console.log('escribiendo '+langcode);
  translation = '{"'+langcode+'":'+JSON.stringify(translation)+'}';
  fs.writeFileSync(root+"/"+langcode+".json", translation, 'utf8');  
});

console.log('escribiendo localeIndex.json');
fs.writeFileSync(root+"/localesIndex.json", generateLocaleIndexJSON(), 'utf8'); 

