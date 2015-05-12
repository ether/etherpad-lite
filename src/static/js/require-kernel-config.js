(function () {
  var pathComponents = location.pathname.split('/');

  // Strip 'p' and the padname from the pathname and set as baseURL
  var baseURL = pathComponents.slice(0,pathComponents.length-2).join('/') + '/';

  require.setRootURI(baseURL + "javascripts/src");
  require.setLibraryURI(baseURL + "javascripts/lib");
  require.setGlobalKeyPath("require");

  window.requireKernel = require;
}());
