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
  var stopSauce = function(success){
    getStatusInterval && clearInterval(getStatusInterval);
    clearTimeout(timeout);

    browserChain.quit();
    setTimeout(function(){
      process.exit(success ? 0 : 1);
    }, 1000);
  }

  var timeout = setTimeout(function(){
    stopSauce(false);
  }, 60000 * 10);

  var knownConsoleText = "";
  var getStatusInterval = setInterval(function(){
    browserChain.eval("$('#console').text()", function(err, consoleText){
      if(!consoleText || err){
        return;
      }
      var newText = consoleText.substr(knownConsoleText.length);
      newText = newText.replace(/\[red\]/g,'\x1B[31m').replace(/\[yellow\]/g,'\x1B[33m')
                .replace(/\[green\]/g,'\x1B[32m').replace(/\[clear\]/g, '\x1B[39m');

      if(newText.length > 0){
        console.log(newText.replace(/\n$/, ""))
      }
      knownConsoleText = consoleText;

      if(knownConsoleText.indexOf("FINISHED") > 0){
        var success = knownConsoleText.indexOf("FAILED") === -1;
        stopSauce(success);
      }
    });
  }, 5000);
});
