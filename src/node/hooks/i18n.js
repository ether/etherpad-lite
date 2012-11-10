var Globalize = require('globalize')
  , fs = require('fs')
  , path = require('path')

fs.readdir(__dirname+"/../../locales", function(er, files) {
  files.forEach(function(locale) {
    locale = locale.split('.')[0]
    if(locale.toLowerCase() == 'en') return;
    require('globalize/lib/cultures/globalize.culture.'+locale+'.js')
  })
})

exports.expressCreateServer = function(n, args) {

  args.app.get('/locale.ini', function(req, res) {
    
    Globalize.culture( req.header('Accept-Language') || 'en' );
    var localePath = path.normalize(__dirname +"/../../locales/"+Globalize.culture().name+".ini");
    res.sendfile(localePath, function(er) {
      if(er) console.error(er)
    });
  })
  
}