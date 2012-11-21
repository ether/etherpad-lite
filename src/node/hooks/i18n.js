var languages = require('languages')
  , fs = require('fs')
  , path = require('path')
  , express = require('express')

var localesPath = __dirname+"/../../locales";

// Serve English strings directly with /locales.ini
var localeIndex = fs.readFileSync(localesPath+'/en.ini')+'\r\n';

// add language base 'en' to availableLangs
exports.availableLangs = {en: languages.getLanguageInfo('en')}

fs.readdir(localesPath, function(er, files) {
  files.forEach(function(locale) {
    locale = locale.split('.')[0]
    if(locale.toLowerCase() == 'en') return;

    // build locale index
    localeIndex += '['+locale+']\r\n@import url(locales/'+locale+'.ini)\r\n'
    
    // add info language {name, nativeName, direction} to availableLangs
    exports.availableLangs[locale]=languages.getLanguageInfo(locale);
  })
})

exports.expressCreateServer = function(n, args) {

  args.app.use('/locales', express.static(localesPath));
  
  args.app.get('/locales.ini', function(req, res) {
    res.send(localeIndex);
  })
  
}
