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

const sauceTestWorker = async.queue(async ({name, pfx, testSettings}) => {
  const fullName = [process.env.GIT_HASH].concat(process.env.SAUCE_NAME || [], name).join(' - ');
  testSettings.name = fullName;
  testSettings.public = true;
  testSettings.build = process.env.GIT_HASH;
  // console.json can be downloaded via saucelabs,
  // don't know how to print them into output of the tests
  testSettings.extendedDebugging = true;
  testSettings.tunnelIdentifier = process.env.TRAVIS_JOB_NUMBER;
  const browser = wd.remote(config, 'promiseChain');
  await browser.init(testSettings);
  const url = `https://saucelabs.com/jobs/${browser.sessionID}`;
  try {
    await browser.get('http://localhost:9001/tests/frontend/');
    log(`Remote sauce test started! ${url}`, pfx);
    // @TODO this should be configured in testSettings, see
    // https://wiki.saucelabs.com/display/DOCS/Test+Configuration+Options#TestConfigurationOptions-Timeouts
    const deadline = Date.now() + 14.5 * 60 * 1000; // Slightly less than overall test timeout.
    // how many characters of the log have been sent to travis
    let logIndex = 0;
    while (true) {
      const remoteFn = ($, skipChars) => $('#console').text().substring(skipChars);
      const consoleText = await browser.eval(`(${remoteFn})($, ${JSON.stringify(logIndex)})`);
      (consoleText ? consoleText.split('\n') : []).forEach((line) => log(line, pfx));
      logIndex += consoleText.length;
      const [finished, nFailedStr] = consoleText.match(finishedRegex) || [];
      if (finished) {
        if (nFailedStr !== '0') process.exitCode = 1;
        break;
      }
      if (Date.now() >= deadline) {
        log('[red]FAILED[clear] allowed test duration exceeded');
        process.exitCode = 1;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } finally {
    log(`Remote sauce test finished! ${url}`, pfx);
    await browser.quit();
  }
}, 6); // run 6 tests in parrallel

Promise.all([
  {
    platform: 'macOS 11.00',
    browserName: 'safari',
    version: 'latest',
  },
  ...(isAdminRunner ? [] : [
    {
      platform: 'Windows 10',
      browserName: 'firefox',
      version: 'latest',
    },
    {
      platform: 'Windows 10',
      browserName: 'MicrosoftEdge',
      version: 'latest',
    },
    {
      platform: 'Windows 10',
      browserName: 'chrome',
      version: 'latest',
      args: ['--use-fake-device-for-media-stream'],
    },
    {
      platform: 'Windows 7',
      browserName: 'chrome',
      version: '55.0',
      args: ['--use-fake-device-for-media-stream'],
    },
  ]),
].map(async (testSettings) => {
  const name = `${testSettings.browserName} ${testSettings.version}, ${testSettings.platform}`;
  const pfx = `[${name}] `;
  try {
    await sauceTestWorker.push({name, pfx, testSettings});
  } catch (err) {
    log(`[red]FAILED[clear] ${err.stack || err}`, pfx);
    process.exitCode = 1;
  }
}));
