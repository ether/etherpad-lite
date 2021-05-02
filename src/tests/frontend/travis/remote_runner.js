'use strict';

// As of v14, Node.js does not exit when there is an unhandled Promise rejection. Convert an
// unhandled rejection into an uncaught exception, which does cause Node.js to exit.
process.on('unhandledRejection', (err) => { throw err; });

const async = require('async');
const wd = require('wd');

const config = {
  hostname: 'ondemand.saucelabs.com',
  port: 80,
  user: process.env.SAUCE_USER,
  pwd: process.env.SAUCE_ACCESS_KEY,
};

const isAdminRunner = process.argv[2] === 'admin';

const colorSubst = {
  red: '\x1B[31m',
  yellow: '\x1B[33m',
  green: '\x1B[32m',
  clear: '\x1B[39m',
};
const colorRegex = new RegExp(`\\[(${Object.keys(colorSubst).join('|')})\\]`, 'g');

const log = (msg, pfx = '') => {
  console.log(`${pfx}${msg.replace(colorRegex, (m, p1) => colorSubst[p1])}`);
};

const finishedRegex = /FINISHED.*[0-9]+ tests passed, ([0-9]+) tests failed/;

const sauceTestWorker = async.queue((testSettings, callback) => {
  const name = `${testSettings.browserName} ${testSettings.version}, ${testSettings.platform}`;
  const pfx = `[${name}] `;
  const fullName = [process.env.GIT_HASH].concat(process.env.SAUCE_NAME || [], name).join(' - ');
  testSettings.name = fullName;
  testSettings.public = true;
  testSettings.build = process.env.GIT_HASH;
  // console.json can be downloaded via saucelabs,
  // don't know how to print them into output of the tests
  testSettings.extendedDebugging = true;
  testSettings.tunnelIdentifier = process.env.TRAVIS_JOB_NUMBER;
  const browser = wd.remote(config, 'promiseChain');
  browser.init(testSettings).get('http://localhost:9001/tests/frontend/', (err) => {
    if (err != null) return callback(err);
    const url = `https://saucelabs.com/jobs/${browser.sessionID}`;
    log(`Remote sauce test started! ${url}`, pfx);

    // tear down the test excecution
    const stopSauce = (testErr) => {
      clearInterval(getStatusInterval);
      clearTimeout(timeout);
      browser.quit((err) => {
        if (err) return callback(err);
        if (testErr) {
          log(`[red]FAILED[clear] ${testErr}`, pfx);
          process.exitCode = 1;
        }
        log(`Remote sauce test finished! ${url}`, pfx);
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
      stopSauce(new Error('allowed test duration exceeded'));
    }, 870000); // travis timeout is 15 minutes, set this to a slightly lower value

    // how many characters of the log have been sent to travis
    let logIndex = 0;
    const getStatusInterval = setInterval(() => {
      browser.eval("$('#console').text()", (err, consoleText) => {
        if (err != null) return stopSauce(err);
        if (!consoleText) return;
        consoleText.substring(logIndex).split('\\n').forEach((line) => log(line, pfx));
        logIndex = consoleText.length;
        const [finished, nFailedStr] = consoleText.match(finishedRegex) || [];
        if (finished) {
          stopSauce(nFailedStr === '0' ? null : new Error(`${nFailedStr} tests failed`));
        }
      });
    }, 5000);
  });
}, 6); // run 6 tests in parrallel

Promise.all([
  {
    platform: 'OS X 10.15',
    browserName: 'safari',
    version: '13.1',
  },
  ...(isAdminRunner ? [] : [
    {
      platform: 'Windows 10',
      browserName: 'firefox',
      version: '84.0',
    },
    {
      platform: 'Windows 7',
      browserName: 'chrome',
      version: '55.0',
      args: ['--use-fake-device-for-media-stream'],
    },
    {
      platform: 'Windows 10',
      browserName: 'microsoftedge',
      version: '83.0',
    },
    {
      platform: 'Windows 7',
      browserName: 'firefox',
      version: '78.0',
    },
  ]),
].map(async (task) => await sauceTestWorker.push(task)));
