/*
  connect to sauce labs
  run 2 tests in parrallel
    - check in 5s interval for status
    - print out result when finished
  - exit with 0 when everything has passed, else with 1
*/
var srcFolder = "../../../src/node_modules/";
var log4js = require(srcFolder + "log4js");
var wd = require(srcFolder + "wd");

var config = {
	  host: "ondemand.saucelabs.com"
  , port: 80
  , username: process.env.SAUCE_USER
  , accessKey: process.env.SAUCE_KEY
}

var browser = wd.remote(config.host, config.port, config.username, config.accessKey);
var browserChain = browser.chain();

var enviroment = {
    'platform'       : 'Linux'
  , 'browserName'    : 'firefox'
  , 'version'        : ''
  , 'name'           : 'Halloween test'
}

browserChain.init(enviroment).get("http://localhost:9001/tests/frontend/", function(){
	setTimeout(function(){
    browserChain.quit();
    setTimeout(function(){
      process.exit(0);
    }, 1000);
	}, 60000);
});
