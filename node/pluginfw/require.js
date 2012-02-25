var plugins = require('./plugins');
var path = require('path');

var SERVER_JS_SRC = path.normalize(path.join(__dirname, '../../'));
var CLIENT_JS_SRC = path.normalize(path.join(__dirname, '../../static/js'));

global.ep_require = function (url) {
  if (url.indexOf("/plugins/") == 0) {
    /* Handle paths like "/plugins/pluginomatic_myplugin/test.js"
       by rewriting it to ROOT_PATH_OF_MYPLUGIN/test.js,
       commonly ETHERPAD_ROOT/node_modules/pluginomatic_myplugin/test.js
    */
    url = url.split("/");
    url.splice(0, 1);
    var plugin_name = url.splice(0, 1)[0];
    url = url.join("/");
    url = path.normalize(path.join(plugins.plugins[plugin_name].package.path, url));
  } else if (url.indexOf("/") == 0) {
    /* Handle all non-plugin paths for files in / */
    url = path.normalize(path.join(SERVER_JS_SRC, url))
  }
  return require(url);
}

global.ep_client_require = function (url) {
  if (url.indexOf("/plugins/") == 0) {
    /* Handle paths like "/plugins/pluginomatic_myplugin/test.js"
       by rewriting it to ROOT_PATH_OF_MYPLUGIN/static/js/test.js,
       commonly ETHERPAD_ROOT/node_modules/pluginomatic_myplugin/static/js/test.js
       For more information see hooks/express/static.js
    */
    url = url.split("/");
    url.splice(0, 2);
    var plugin_name = url.splice(0, 1)[0];
    url = url.join("/");
    url = path.normalize(path.join(plugins.plugins[plugin_name].package.path, "static/js", url));
  } else if (url.indexOf("/") == 0) {
    /* Handle all non-plugin paths for files in /static */
    url = path.normalize(path.join(CLIENT_JS_SRC, url))
  }
  return require(url);
}
