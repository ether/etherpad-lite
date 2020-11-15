const srcFolder = "../../../src/node_modules/";
const { Builder, By }= require(srcFolder + "selenium-webdriver");
const baseUrl = "http://localhost:9001/tests/frontend";
let driver;
let getStatusInterval;
let timeout;
let allTestsPassed = true;

let testSettings = {"browserName":"Chrome", "platformName":"Windows 10", "browserVersion":"latest"}
let name = `${process.env.GIT_HASH} - ${testSettings.browserName} ${testSettings.browserVersion} ${testSettings.platformName}`;

runTest(testSettings)

async function runTest(testSettings){
  driver = await new Builder().withCapabilities({
    'bstack:options' : {
      "os" : "Windows",
      "osVersion" : "10",
      "buildName" : process.env.GIT_HASH,
      "sessionName" : name,
      "local" : "true",
      "consoleLogs" : "verbose",
      "networkLogs" : "true",
      "seleniumVersion" : "4.0.0-alpha-6",
      "userName" : process.env.BROWSERSTACK_USERNAME,
      "accessKey" : process.env.BROWSERSTACK_ACCESS_KEY,
      "localIdentifier": process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
    },
    "browserName" : "Chrome",
    "browserVersion" : "latest"
    //'extendedDebugging': true, // when possible, enables network.har file and network tab
    //'capturePerformance': true, // when possible, enables various performance related metrics
  }).usingServer("https://hub-cloud.browserstack.com/wd/hub").build();
  let session = await driver.getSession();
  session = session.id_;
  console.log(`https://saucelabs.com/jobs/${session}`);

  driver.get(baseUrl).then(async function(){
    let frame = await driver.findElement(By.id('magicdomid2'));
    await frame.sendkeys("test");
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
