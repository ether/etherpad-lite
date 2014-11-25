(function(document) {
  // Set language for l10n
  var language = document.cookie.match(/language=((\w{2,3})(-\w+)?)/);
  if(language) language = language[1];

  html10n.bind('indexed', function() {
    html10n.localize([language, navigator.language, navigator.userLanguage, 'en'])
  })
  
  html10n.bind('localized', function() {
    document.documentElement.lang = html10n.getLanguage()
    document.documentElement.dir = html10n.getDirection()
  })
})(document)