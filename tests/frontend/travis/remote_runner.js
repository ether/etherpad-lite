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

  // we wait 10 seconds here with the hope it was enough time for the minified files to be built etc.
  setTimeout(function(){
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
      }, 1200000 * 10);

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

  }, 10000);

}, 1); //run 1 test in parrallel

// Firefox on Linux
sauceTestWorker.push({
    'platform'       : 'Linux'
  , 'browserName'    : 'firefox'
  , 'version'        : '45.0'
});
sauceTestWorker.push({
    'platform'       : 'Linux'
  , 'browserName'    : 'firefox'
  , 'version'        : '44.0'
});
sauceTestWorker.push({
    'platform'       : 'Linux'
  , 'browserName'    : 'firefox'
  , 'version'        : '43.0'
});

// Chrome on Linux
sauceTestWorker.push({
    'platform'       : 'Linux'
  , 'browserName'    : 'googlechrome'
  , 'version'        : '48.0'
});
sauceTestWorker.push({
    'platform'       : 'Linux'
  , 'browserName'    : 'googlechrome'
  , 'version'        : '47.0'
});
sauceTestWorker.push({
    'platform'       : 'Linux'
  , 'browserName'    : 'googlechrome'
  , 'version'        : '46.0'
});

// Chrome on OSX 10.15
sauceTestWorker.push({
    'platform'       : 'macOS 10.15'
  , 'browserName'    : 'chrome'
  , 'version'        : '83.0'
});
sauceTestWorker.push({
    'platform'       : 'macOS 10.15'
  , 'browserName'    : 'chrome'
  , 'version'        : '81.0'
});

// Safari on OSX 10.15
sauceTestWorker.push({
    'platform'       : 'macOS 10.15'
  , 'browserName'    : 'safari'
  , 'version'        : '13.1'
});

// Edge on OSX 10.15
sauceTestWorker.push({
    'platform'       : 'macOS 10.15'
  , 'browserName'    : 'MicrosoftEdge'
  , 'version'        : '83.0'
});

sauceTestWorker.push({
    'platform'       : 'macOS 10.15'
  , 'browserName'    : 'MicrosoftEdge'
  , 'version'        : '81.0'
});

// Chrome on OSX 10.14
sauceTestWorker.push({
    'platform'       : 'macOS 10.14'
  , 'browserName'    : 'chrome'
  , 'version'        : '83.0'
});
sauceTestWorker.push({
    'platform'       : 'macOS 10.14'
  , 'browserName'    : 'chrome'
  , 'version'        : '81.0'
});

// Safari on OSX 10.14
sauceTestWorker.push({
    'platform'       : 'macOS 10.14'
  , 'browserName'    : 'safari'
  , 'version'        : '12.0'
});

// Edge on OSX 10.14
sauceTestWorker.push({
    'platform'       : 'macOS 10.14'
  , 'browserName'    : 'MicrosoftEdge'
  , 'version'        : '83.0'
});

sauceTestWorker.push({
    'platform'       : 'macOS 10.14'
  , 'browserName'    : 'MicrosoftEdge'
  , 'version'        : '81.0'
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
// Edge on Win 10
sauceTestWorker.push({
    'platform'       : 'Windows 10'
  , 'browserName'    : 'MicrosoftEdge'
  , 'version'        : '83.0'
});
sauceTestWorker.push({
    'platform'       : 'Windows 10'
  , 'browserName'    : 'MicrosoftEdge'
  , 'version'        : '81.0'
});

// Chrome on Win 10
sauceTestWorker.push({
    'platform'       : 'Windows 10'
  , 'browserName'    : 'chrome'
  , 'version'        : '83.0'
});
sauceTestWorker.push({
    'platform'       : 'Windows 10'
  , 'browserName'    : 'chrome'
  , 'version'        : '81.0'
});

// Firefox on Win 10
sauceTestWorker.push({
    'platform'       : 'Windows 10'
  , 'browserName'    : 'firefox'
  , 'version'        : '78.0'
});
sauceTestWorker.push({
    'platform'       : 'Windows 10'
  , 'browserName'    : 'firefox'
  , 'version'        : '77.0'
});

// IE on Win 10
sauceTestWorker.push({
    'platform'       : 'Windows 10'
  , 'browserName'    : 'internet explorer'
  , 'version'        : '11.285'
});


sauceTestWorker.drain = function() {
  setTimeout(function(){
    process.exit(allTestsPassed ? 0 : 1);
  }, 3000);
}
