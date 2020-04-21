var srcFolder = "../../../src/node_modules/";
var wd = require(srcFolder + "wd");
var async = require(srcFolder + "async");

var config = {
    host: "ondemand.saucelabs.com"
  , port: 80
  , username: process.env.SAUCE_USER
  , accessKey: process.env.SAUCE_ACCESS_KEY
}

var allTestsPassed = true;

var sauceTestWorker = async.queue(function (testSettings, callback) {
  var browser = wd.promiseChainRemote(config.host, config.port, config.username, config.accessKey);
  var name = process.env.GIT_HASH + " - " + testSettings.browserName + " " + testSettings.version + ", " + testSettings.platform;
  testSettings.name = name;
  testSettings["public"] = true;
  testSettings["build"] = process.env.GIT_HASH;

  browser.init(testSettings).get("http://localhost:9001/tests/frontend/", function(){
    var url = "https://saucelabs.com/jobs/" + browser.sessionID;
    console.log("Remote sauce test '" + name + "' started! " + url);

    //tear down the test excecution
    var stopSauce = function(success){
      getStatusInterval && clearInterval(getStatusInterval);
      clearTimeout(timeout);

      browser.quit();

      if(!success){
        allTestsPassed = false;
      }

      var testResult = knownConsoleText.replace(/\[red\]/g,'\x1B[31m').replace(/\[yellow\]/g,'\x1B[33m')
                       .replace(/\[green\]/g,'\x1B[32m').replace(/\[clear\]/g, '\x1B[39m');
      testResult = testResult.split("\\n").map(function(line){
        return "[" + testSettings.browserName + (testSettings.version === "" ? '' : (" " + testSettings.version)) + "] " + line;
      }).join("\n");

      console.log(testResult);
      console.log("Remote sauce test '" + name + "' finished! " + url);

      callback();
    }

    //timeout for the case the test hangs
    var timeout = setTimeout(function(){
      stopSauce(false);
    }, 60000 * 10);

    var knownConsoleText = "";
    var getStatusInterval = setInterval(function(){
      browser.eval("$('#console').text()", function(err, consoleText){
        if(!consoleText || err){
          return;
        }
        knownConsoleText = consoleText;

        if(knownConsoleText.indexOf("FINISHED") > 0){
          var success = knownConsoleText.indexOf("FAILED") === -1;
          stopSauce(success);
        }
      });
    }, 5000);
  });
}, 5); //run 5 tests in parrallel

// 1) Firefox on Linux
sauceTestWorker.push({
    'platform'       : 'Linux'
  , 'browserName'    : 'firefox'
  , 'version'        : 'latest'
});

// 2) Chrome on Linux
sauceTestWorker.push({
    'platform'       : 'Linux'
  , 'browserName'    : 'googlechrome'
  , 'version'        : 'latest'
});

// 3) Safari on OSX 10.15
sauceTestWorker.push({
    'platform'       : 'OS X 10.15'
  , 'browserName'    : 'safari'
  , 'version'        : 'latest'
});

// 4) IE 10 on Win 8
sauceTestWorker.push({
    'platform'       : 'Windows 8'
  , 'browserName'    : 'iexplore'
  , 'version'        : '10.0'
});

// 5) Edge on Win 10
sauceTestWorker.push({
    'platform'       : 'Windows 10'
  , 'browserName'    : 'microsoftedge'
  , 'version'        : 'latest'
});

sauceTestWorker.drain = function() {
  setTimeout(function(){
    process.exit(allTestsPassed ? 0 : 1);
  }, 3000);
}
