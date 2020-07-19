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
  testSettings["extendedDebugging"] = true; // console.json can be downloaded via saucelabs, don't know how to print them into output of the tests
  testSettings["tunnelIdentifier"] = process.env.TRAVIS_JOB_NUMBER;

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
          return "[" + testSettings.browserName + " " + testSettings.platform + (testSettings.version === "" ? '' : (" " + testSettings.version)) + "] " + line;
        }).join("\n");

        console.log(testResult);
        console.log("Remote sauce test '" + name + "' finished! " + url);

        callback();
      }

      /**
       * timeout for the case the test hangs
       * @todo this should be configured in testSettings, see https://wiki.saucelabs.com/display/DOCS/Test+Configuration+Options#TestConfigurationOptions-Timeouts
       */
      var timeout = setTimeout(function(){
        stopSauce(false);
      }, 1200000 * 10);

      var knownConsoleText = "";
      var getStatusInterval = setInterval(function(){
        browser.eval("$('#console').text()", function(err, consoleText){
          if(!consoleText || err){
            return;
          }
          knownConsoleText = consoleText;

          if(knownConsoleText.indexOf("FINISHED") > 0){
            let match = knownConsoleText.match(/FINISHED - ([0-9]+) tests passed, ([0-9]+) tests failed/);
            if (match[2] && match[2] == 0){
              stopSauce(true);
            }
            else {
              stopSauce(false);
            }
          }
        });
      }, 5000);
    });

}, 6); //run 6 tests in parrallel

// 1) Firefox on Linux
sauceTestWorker.push({
    'platform'       : 'Windows 7'
  , 'browserName'    : 'firefox'
  , 'version'        : '52.0'
});

// 2) Chrome on Linux
sauceTestWorker.push({
    'platform'       : 'Windows 7'
  , 'browserName'    : 'chrome'
  , 'version'        : '55.0'
});

// 3) Safari on OSX 10.15
sauceTestWorker.push({
    'platform'       : 'OS X 10.15'
  , 'browserName'    : 'safari'
  , 'version'        : '13.1'
});

// 4) Safari on OSX 10.14
sauceTestWorker.push({
    'platform'       : 'OS X 10.14'
  , 'browserName'    : 'safari'
  , 'version'        : '12.0'
});
// IE 10 doesn't appear to be working anyway
/*
// 4) IE 10 on Win 8
sauceTestWorker.push({
    'platform'       : 'Windows 8'
  , 'browserName'    : 'iexplore'
  , 'version'        : '10.0'
});
*/
// 5) Edge on Win 10
sauceTestWorker.push({
    'platform'       : 'Windows 10'
  , 'browserName'    : 'microsoftedge'
  , 'version'        : '83.0'
});
// 6) Firefox on Win 7
sauceTestWorker.push({
    'platform'       : 'Windows 7'
  , 'browserName'    : 'firefox'
  , 'version'        : '78.0'
});

sauceTestWorker.drain = function() {
  setTimeout(function(){
    process.exit(allTestsPassed ? 0 : 1);
  }, 3000);
}
