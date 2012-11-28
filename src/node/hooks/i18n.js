var http = require ('http')
  , fs = require('fs')
  , path = require('path')
  , express = require('express')

var localesPath = __dirname+"/../../locales";

// Serve English strings directly with /locales.ini
var localeIndex = fs.readFileSync(localesPath+'/en.ini')+'\r\n';

exports.availableLangs = {'en': {'nativeName': 'English'}};

// build availableLangs with translatewiki web API
var request = http.request ('http://translatewiki.net/w/api.php?action=query&meta=siteinfo&siprop=languages&format=json',
  function (res) {
    var twLangs = '';
    res.setEncoding ('utf8');
    res.on ('data', function (chunk) { twLangs += chunk; });
    res.on ('end', function () {
      // twLangs = [{code: 'en', '*': 'English'}...] 
      twLangs = JSON.parse(twLangs)['query']['languages'];

      fs.readdir(localesPath, function(er, files) {
        files.forEach(function(locale) {
          locale = locale.split('.')[0];
          if(locale.toLowerCase() == 'en') return;

          // build locale index
          localeIndex += '['+locale+']\r\n@import url(locales/'+locale+'.ini)\r\n';
    
          for (var l = 0; l < twLangs.length; l++) {
            var code = twLangs[l]['code'];
            if (locale == code) {
              var nativeName = twLangs[l]['*'];
              exports.availableLangs[code] = {'nativeName': nativeName};
            }
          }
        });
      });
    });
  }).on ('error', function(e) {
    console.error('While query translatewiki API: '+e.message);
  }).end();

exports.expressCreateServer = function(n, args) {

  args.app.use('/locales', express.static(localesPath));
  
  args.app.get('/locales.ini', function(req, res) {
    res.send(localeIndex);
  })
  
}
