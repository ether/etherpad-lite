'use strict';

const async = require('async');
const wd = require('wd');

const config = {
  host: 'ondemand.saucelabs.com',
  port: 80,
  username: process.env.SAUCE_USER,
  accessKey: process.env.SAUCE_ACCESS_KEY,
};

const isAdminRunner = process.argv[2] === 'admin';

let allTestsPassed = true;
// overwrite the default exit code
// in case not all worker can be run (due to saucelabs limits),
// `queue.drain` below will not be called
// and the script would silently exit with error code 0
process.exitCode = 2;
process.on('exit', (code) => {
  if (code === 2) {
    console.log('\x1B[31mFAILED\x1B[39m Not all saucelabs runner have been started.');
  }
});

const sauceTestWorker = async.queue((testSettings, callback) => {
  const browser = wd.promiseChainRemote(
      config.host, config.port, config.username, config.accessKey);
  const name = [process.env.GIT_HASH].concat(process.env.SAUCE_NAME || []).concat([
    `${testSettings.browserName} ${testSettings.version}, ${testSettings.platform}`,
  ]).join(' - ');
  testSettings.name = name;
  testSettings.public = true;
  testSettings.build = process.env.GIT_HASH;
  // console.json can be downloaded via saucelabs,
  // don't know how to print them into output of the tests
  testSettings.extendedDebugging = true;
  testSettings.tunnelIdentifier = process.env.TRAVIS_JOB_NUMBER;

  browser.init(testSettings).get('http://localhost:9001/tests/frontend/', () => {
    const url = `https://saucelabs.com/jobs/${browser.sessionID}`;
    console.log(`Remote sauce test '${name}' started! ${url}`);

    // tear down the test excecution
    const stopSauce = (success, timesup) => {
      clearInterval(getStatusInterval);
      clearTimeout(timeout);

      browser.quit(() => {
        if (!success) {
          allTestsPassed = false;
        }

        // if stopSauce is called via timeout
        // (in contrast to via getStatusInterval) than the log of up to the last
        // five seconds may not be available here. It's an error anyway, so don't care about it.
        printLog(logIndex);

        if (timesup) {
          console.log(`[${testSettings.browserName} ${testSettings.platform}` +
            `${testSettings.version === '' ? '' : (` ${testSettings.version}`)}]` +
            ' \x1B[31mFAILED\x1B[39m allowed test duration exceeded');
        }
        console.log(`Remote sauce test '${name}' finished! ${url}`);

        callback();
      });
    };

    /**
       * timeout if a test hangs or the job exceeds 14.5 minutes
       * It's necessary because if travis kills the saucelabs session due to inactivity,
       * we don't get any output
       * @todo this should be configured in testSettings, see
       * https://wiki.saucelabs.com/display/DOCS/Test+Configuration+Options#TestConfigurationOptions-Timeouts
       */
    const timeout = setTimeout(() => {
      stopSauce(false, true);
    }, 870000); // travis timeout is 15 minutes, set this to a slightly lower value

    let knownConsoleText = '';
    // how many characters of the log have been sent to travis
    let logIndex = 0;
    const getStatusInterval = setInterval(() => {
      browser.eval("$('#console').text()", (err, consoleText) => {
        if (!consoleText || err) {
          return;
        }
        knownConsoleText = consoleText;

        if (knownConsoleText.indexOf('FINISHED') > 0) {
          const match = knownConsoleText.match(
              /FINISHED.*([0-9]+) tests passed, ([0-9]+) tests failed/);
          // finished without failures
          if (match[2] && match[2] === '0') {
            stopSauce(true);

            // finished but some tests did not return or some tests failed
          } else {
            stopSauce(false);
          }
        } else {
          // not finished yet
          printLog(logIndex);
          logIndex = knownConsoleText.length;
        }
      });
    }, 5000);

    /**
       * Replaces color codes in the test runners log, appends
       * browser name, platform etc. to every line and prints them.
       *
       * @param {number} index offset from where to start
       */
    const printLog = (index) => {
      let testResult = knownConsoleText.substring(index)
          .replace(/\[red\]/g, '\x1B[31m').replace(/\[yellow\]/g, '\x1B[33m')
          .replace(/\[green\]/g, '\x1B[32m').replace(/\[clear\]/g, '\x1B[39m');
      testResult = testResult.split('\\n').map((line) => `[${testSettings.browserName} ` +
        `${testSettings.platform}` +
        `${testSettings.version === '' ? '' : (` ${testSettings.version}`)}]` +
        `${line}`).join('\n');

      console.log(testResult);
    };
  });
}, 6); // run 6 tests in parrallel

if (!isAdminRunner) {
  // 1) Firefox on Linux
  sauceTestWorker.push({
    platform: 'Windows 7',
    browserName: 'firefox',
    version: '52.0',
  });

  // 2) Chrome on Linux
  sauceTestWorker.push({
    platform: 'Windows 7',
    browserName: 'chrome',
    version: '55.0',
    args: ['--use-fake-device-for-media-stream'],
  });

  /*
  // 3) Safari on OSX 10.15
  sauceTestWorker.push({
      'platform'       : 'OS X 10.15'
    , 'browserName'    : 'safari'
    , 'version'        : '13.1'
  });
  */

  // 4) Safari on OSX 10.14
  sauceTestWorker.push({
    platform: 'OS X 10.15',
    browserName: 'safari',
    version: '13.1',
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
    platform: 'Windows 10',
    browserName: 'microsoftedge',
    version: '83.0',
  });
  // 6) Firefox on Win 7
  sauceTestWorker.push({
    platform: 'Windows 7',
    browserName: 'firefox',
    version: '78.0',
  });
} else {
  // 4) Safari on OSX 10.14
  sauceTestWorker.push({
    platform: 'OS X 10.15',
    browserName: 'safari',
    version: '13.1',
  });
}

sauceTestWorker.drain(() => {
  process.exit(allTestsPassed ? 0 : 1);
});
