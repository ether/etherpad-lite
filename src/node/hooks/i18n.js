var Globalize = require('globalize')
  , fs = require('fs')
  , path = require('path')

exports.availableLangs = {en: 'English'}
fs.readdir(__dirname+"/../../locales", function(er, files) {
  files.forEach(function(locale) {
    locale = locale.split('.')[0]
    if(locale.toLowerCase() == 'en') return;

    require('globalize/lib/cultures/globalize.culture.'+locale+'.js')
    var culture = Globalize.cultures[locale];
    exports.availableLangs[culture.name] = culture.nativeName;
  })
})

exports.expressCreateServer = function(n, args) {

  args.app.get('/locale.ini', function(req, res) {
    // let gloablize find out the preferred locale and default to 'en'
    Globalize.culture(req.cookies['language'] || req.header('Accept-Language') || 'en');
    var localePath = path.normalize(__dirname +"/../../locales/"+Globalize.culture().name+".ini");
    res.sendfile(localePath, function(er) {
      if(er) console.error(er)
    });
  })
  
}