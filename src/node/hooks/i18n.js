var languages = require('languages4translatewiki')
  , fs = require('fs')
  , path = require('path')
  , express = require('express')

var localesPath = __dirname+"/../../locales";

// Serve English strings directly with /locales.ini
var localeIndex = fs.readFileSync(localesPath+'/en.ini')+'\r\n';

exports.availableLangs = {'en': {'nativeName': 'English'}};

fs.readdir(localesPath, function(er, files) {
  files.forEach(function(locale) {
    var ext = path.extname(locale);
    locale = path.basename(locale, ext).toLowerCase();
    if(locale == 'en' || ext != '.ini') return;

    // build locale index
    localeIndex += '['+locale+']\r\n@import url(locales/'+locale+'.ini)\r\n'
    
    // add info language {nativeName, direction} to availableLangs
    exports.availableLangs[locale]=languages.getLanguageInfo(locale);
  })
})


exports.expressCreateServer = function(n, args) {

  args.app.use('/locales', express.static(localesPath));
  
  args.app.get('/locales.ini', function(req, res) {
    res.send(localeIndex);
  })
  
}
