var srcFolder = "../../../src/node_modules/";
var wd = require(srcFolder + "wd");
var async = require(srcFolder + "async");
var nodeHTMLParser = require(srcFolder + "node-html-parser");

var config = {
    host: "ondemand.saucelabs.com"
  , port: 80
  , username: process.env.SAUCE_USER
  , accessKey: process.env.SAUCE_ACCESS_KEY
}

var allTestsPassed = true;

var customReporter = '';
var passes = 0;
var failures = 0;
var time = 0;
var ident = '  ';

function generateResult(result) {
  result.map(function(r) {
    var resultClass = r.classNames;
    if(resultClass.includes('pass') && !resultClass.includes('pending')) {
      customReporter += ident + '-> PASSED : ';
      passes++
    } else if(resultClass.includes('pending')) {
      customReporter += ident + '-> PENDING : '
    } else {
      customReporter += ident + '-> FAILED : ';
      failures++;
    }
    customReporter += r.childNodes[0].childNodes[0].rawText + '\n';
    if(r.childNodes[0].childNodes[1]) {
      var singleTestTime = parseInt(r.childNodes[0].childNodes[1].rawText) || 0;
      time+=singleTestTime;
    }
  })
  customReporter += '\\n'
}

function generateSuite(nodes) {
  customReporter += ident + nodes.childNodes[0].rawText + '\n';
  ident += '  '
  var list = nodes.childNodes;
  if(list[1].childNodes[0].classNames.includes('suite')) {
    generateSuite(list[1].childNodes[0])
  } else {
    generateResult(list[1].childNodes)
  }
  ident = '  '
}

function toHHMMSS(time) {
  var sec_num = parseInt(time, 10); // don't forget the second param
  var hours   = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  var seconds = sec_num - (hours * 3600) - (minutes * 60);

  if (hours   < 10) {hours   = "0"+hours;}
  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  return hours+':'+minutes+':'+seconds;
}

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
      browser.eval("$('#mocha-report')[0].outerHTML", function(err, consoleText){
        console.log('consoleText', consoleText)
        var report = nodeHTMLParser.parse(consoleText);
        console.log('report', report.structure)
        var root = report.querySelector('#mocha-report');
        var childNodes = root.childNodes;
        if(childNodes.length) {
          childNodes.map(function(nodes) {
            if(nodes.classNames.includes("suite")) {
              generateSuite(nodes)
            }
          })
          //customReporter += "FINISHED - " + passes + " tests passed, " + failures + " tests failed, duration: " + toHHMMSS(time);
          console.log('customReporter', customReporter)
          knownConsoleText = customReporter;
        }

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
