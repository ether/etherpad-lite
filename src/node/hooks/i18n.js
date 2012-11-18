var Globalize = require('globalize')
  , fs = require('fs')
  , path = require('path')
  , eejs = require('ep_etherpad-lite/node/eejs')
  , express = require('express')
  , translate = require ('../utils/translate')

var localesPath = __dirname+"/../../locales"
  , templatesPath = __dirname+"/../../templates";

// Serve English strings directly with /locales.ini
var localeIndex = fs.readFileSync(localesPath+'/en.ini')+'\r\n';

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
  });

  args.app.get('/translate', function(req, res) {
    res.send( eejs.require("ep_etherpad-lite/templates/translate.html", {}) );
  });

  args.app.get('/translate/:lang_code', function(req, res) {
    var lang_code = req.params.lang_code.substr(0,2),
        ids = translate.extractIDs(templatesPath);
    res.charset = 'utf-8';
    res.contentType('text');
    res.send(translate.getTranslationINI(localesPath, lang_code, ids));
  });
  
}
