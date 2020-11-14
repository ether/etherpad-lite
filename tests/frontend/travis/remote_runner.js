const srcFolder = "../../../src/node_modules/";
const { Builder }= require(srcFolder + "selenium-webdriver");
const baseUrl = "http://localhost:9001/tests/frontend";
let driver;
let getStatusInterval;
let timeout;
let allTestsPassed = true;

let testSettings = {"browserName":"chrome", "platformName":"Windows 10", "browserVersion":"latest"}
let name = `${process.env.GIT_HASH} - ${testSettings.browserName} ${testSettings.browserVersion} ${testSettings.platformName}`;

runTest(testSettings)

async function runTest(testSettings){
  driver = await new Builder().withCapabilities({
    'browserName': testSettings.browserName,
    'platformName': testSettings.platformName,
    'browserVersion': testSettings.browserVersion,
    'extendedDebugging': true, // when possible, enables network.har file and network tab
    'capturePerformance': true, // when possible, enables various performance related metrics
    'sauce:options': {
        'username': process.env.SAUCE_USERNAME,
        'accessKey': process.env.SAUCE_ACCESS_KEY,
        'build': process.env.GIT_HASH,
        'tunnelIdentifier': process.env.TRAVIS_JOB_NUMBER,
        'extendedDebugging': true, // when possible, enables network.har file and network tab
        'capturePerformance': true, // when possible, enables various performance related metrics
        'name': name,
        /* As a best practice, set important test metadata and execution options
        such as build info, tags for reporting, and timeout durations.
        */
        'maxDuration': 180,
        'idleTimeout': 1000
    }
  }).usingServer("https://ondemand.saucelabs.com/wd/hub").build();
  let session = await driver.getSession();
  session = session.id_;
  console.log(`https://saucelabs.com/jobs/${session}`);

  driver.get(baseUrl).then(function(){
    getStatusInterval = setInterval(function(){
      driver.executeScript("return $('#console').text()")
        .then(function(knownConsoleText){
        if(knownConsoleText.indexOf("FINISHED") > 0){
          let match = knownConsoleText.match(/FINISHED.*([0-9]+) tests passed, ([0-9]+) tests failed/);
          // finished without failures
          if (match[2] && match[2] == '0'){
            stopSauce(true, false, knownConsoleText);

          // finished but some tests did not return or some tests failed
          } else {
            stopSauce(false, false, knownConsoleText);
          }
        }
      })
        .catch(function(err){console.log(`setInterval ${err}`)})
    }, 5000);

    /**
     * timeout if a test hangs or the job exceeds 9.5 minutes
     * It's necessary because if travis kills the saucelabs session due to inactivity, we don't get any output
     * @todo this should be configured in testSettings, see https://wiki.saucelabs.com/display/DOCS/Test+Configuration+Options#TestConfigurationOptions-Timeouts
     */
    timeout = setTimeout(function(){
      stopSauce(false,true,"");
    }, 570000); // travis timeout is 10 minutes, set this to a slightly lower value

  //tear down the test excecution
  async function stopSauce(success,timesup, knownConsoleText){
    clearInterval(getStatusInterval);
    clearTimeout(timeout);

    if(!success){
      allTestsPassed = false;
    }

    // if stopSauce is called via timeout (in contrast to via getStatusInterval) than the log of up to the last
    // five seconds may not be available here. It's an error anyway, so don't care about it.
    var testResult = knownConsoleText.replace(/\[red\]/g,'\x1B[31m').replace(/\[yellow\]/g,'\x1B[33m')
                     .replace(/\[green\]/g,'\x1B[32m').replace(/\[clear\]/g, '\x1B[39m');
    testResult = testResult.split("\\n").map(function(line){
      return "[" + testSettings.browserName + " " + testSettings.platformName + (testSettings.browserVersion === "" ? '' : (" " + testSettings.browserVersion)) + "] " + line;
    }).join("\n");

    console.log(testResult);
    if (timesup) {
      console.log("[" + testSettings.browserName + " " + testSettings.platformName + (testSettings.browserVersion === "" ? '' : (" " + testSettings.browserVersion)) + "] \x1B[31mFAILED\x1B[39m allowed test duration exceeded");
    }
    console.log(`Remote sauce test ${name} finished! https://saucelabs.com/jobs/${session}`);

    await driver.quit();
    process.exit(allTestsPassed ? 0 : 1);
  }
    return
  }).catch(function(err){console.log(`error while running the tests ${err}`)})
}
