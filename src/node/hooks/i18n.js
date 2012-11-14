var Globalize = require('globalize')
  , fs = require('fs')
  , path = require('path')
  , express = require('express')

var localesPath = __dirname+"/../../locales";

var localeIndex = '[*]\r\n@import url(locales/en.ini)\r\n';
exports.availableLangs = {en: 'English'};

fs.readdir(localesPath, function(er, files) {
  files.forEach(function(locale) {
    locale = locale.split('.')[0]
    if(locale.toLowerCase() == 'en') return;

    // build locale index
    localeIndex += '['+locale+']\r\n@import url(locales/'+locale+'.ini)\r\n'
    
    require('globalize/lib/cultures/globalize.culture.'+locale+'.js')
    var culture = Globalize.cultures[locale];
    exports.availableLangs[culture.name] = culture.nativeName;
  })
})

exports.expressCreateServer = function(n, args) {

  args.app.use('/locales', express.static(localesPath));
  
  args.app.get('/locales.ini', function(req, res) {
    res.send(localeIndex);
  })
  
}