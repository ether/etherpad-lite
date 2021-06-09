'use strict';

// $(handler), $().ready(handler), $.wait($.ready).then(handler), etc. don't work if handler is an
// async function for some bizarre reason, so the async function is wrapped in a non-async function.
$(() => (async () => {
  const stringifyException = (exception) => {
    let err = exception.stack || exception.toString();

    // FF / Opera do not add the message
    if (!~err.indexOf(exception.message)) {
      err = `${exception.message}\n${err}`;
    }

    // <=IE7 stringifies to [Object Error]. Since it can be overloaded, we
    // check for the result of the stringifying.
    if (err === '[object Error]') err = exception.message;

    // Safari doesn't give you a stack. Let's at least provide a source line.
    if (!exception.stack && exception.sourceURL && exception.line !== undefined) {
      err += `\n(${exception.sourceURL}:${exception.line})`;
    }

    return err;
  };

  const customRunner = (runner) => {
    const stats = {suites: 0, tests: 0, passes: 0, pending: 0, failures: 0};
    let level = 0;

    if (!runner) return;

    // AUTO-SCROLLING:

    // Mocha can start multiple suites before the first 'suite' event is emitted. This can break the
    // logic used to determine if the div is already scrolled to the bottom. If this is false,
    // auto-scrolling unconditionally scrolls to the bottom no matter how far up the div is
    // currently scrolled. If true, auto-scrolling only happens if the div is scrolled close to the
    // bottom.
    let manuallyScrolled = false;
    // The 'scroll' event is fired for manual scrolling as well as JavaScript-initiated scrolling.
    // This is incremented while auto-scrolling and decremented when done auto-scrolling. This is
    // used to ensure that auto-scrolling never sets manuallyScrolled to true.
    let autoScrolling = 0;

    // Auto-scroll the #mocha-report div to show the newly added test entry if it was previously
    // scrolled to the bottom.
    const autoscroll = (newElement) => {
      const mr = $('#mocha-report')[0];
      const scroll = !manuallyScrolled || (() => {
        const offsetTopAbs = newElement.getBoundingClientRect().top;
        const mrOffsetTopAbs = mr.getBoundingClientRect().top - mr.scrollTop;
        const offsetTop = offsetTopAbs - mrOffsetTopAbs;
        // Add some margin to cover rounding error and to make it easier to engage the auto-scroll.
        return offsetTop <= mr.clientHeight + mr.scrollTop + 5;
      })();
      if (!scroll) return;
      ++autoScrolling;
      mr.scrollTop = mr.scrollHeight;
      manuallyScrolled = false;
    };

    $('#mocha-report').on('scroll', () => {
      if (!autoScrolling) manuallyScrolled = true;
      else --autoScrolling;
    });

    runner.on('start', () => {
      stats.start = new Date();
    });

    runner.on('suite', (suite) => {
      if (suite.root) return;
      autoscroll($('#mocha-report .suite').last()[0]);
      stats.suites++;
      append(suite.title);
      level++;
    });

    runner.on('suite end', (suite) => {
      if (suite.root) return;
      level--;

      if (level === 0) {
        append('');
      }
    });

    // max time a test is allowed to run
    // TODO this should be lowered once timeslider_revision.js is faster
    let killTimeout;
    runner.on('test end', () => {
      autoscroll($('#mocha-report .test').last()[0]);
      stats.tests++;
    });

    runner.on('pass', (test) => {
      if (killTimeout) clearTimeout(killTimeout);
      killTimeout = setTimeout(() => {
        append('FINISHED - [red]no test started since 5 minutes, tests stopped[clear]');
      }, 60000 * 5);

      const medium = test.slow() / 2;
      test.speed = test.duration > test.slow()
        ? 'slow'
        : test.duration > medium
          ? 'medium'
          : 'fast';

      stats.passes++;
      append(`-> [green]PASSED[clear] : ${test.title}   ${test.duration} ms`);
    });

    runner.on('fail', (test, err) => {
      if (killTimeout) clearTimeout(killTimeout);
      killTimeout = setTimeout(() => {
        append('FINISHED - [red]no test started since 5 minutes, tests stopped[clear]');
      }, 60000 * 5);

      stats.failures++;
      test.err = err;
      append(`-> [red]FAILED[clear] : ${test.title} ${stringifyException(test.err)}`);
    });

    runner.on('pending', (test) => {
      if (killTimeout) clearTimeout(killTimeout);
      killTimeout = setTimeout(() => {
        append('FINISHED - [red]no test started since 5 minutes, tests stopped[clear]');
      }, 60000 * 5);

      stats.pending++;
      append(`-> [yellow]PENDING[clear]: ${test.title}`);
    });

    const $console = $('#console');
    const append = (text) => {
      // Indent each line.
      const lines = text.split('\n').map((line) => ' '.repeat(level * 2) + line);
      $console.append(document.createTextNode(`${lines.join('\n')}\n`));
    };

    const total = runner.total;
    runner.on('end', () => {
      stats.end = new Date();
      stats.duration = stats.end - stats.start;
      const minutes = Math.floor(stats.duration / 1000 / 60);
      // chrome < 57 does not like this .toString().padStart('2', '0');
      const seconds = Math.round((stats.duration / 1000) % 60);
      if (stats.tests === total) {
        append(`FINISHED - ${stats.passes} tests passed, ${stats.failures} tests failed, ` +
               `${stats.pending} pending, duration: ${minutes}:${seconds}`);
      } else if (stats.tests > total) {
        append(`FINISHED - but more tests than planned returned ${stats.passes} tests passed, ` +
               `${stats.failures} tests failed, ${stats.pending} pending, ` +
               `duration: ${minutes}:${seconds}`);
        append(`${total} tests, but ${stats.tests} returned. ` +
               'There is probably a problem with your async code or error handling, ' +
               'see https://github.com/mochajs/mocha/issues/1327');
      } else {
        append(`FINISHED - but not all tests returned ${stats.passes} tests passed, ` +
               `${stats.failures} tests failed, ${stats.pending} tests pending, ` +
               `duration: ${minutes}:${seconds}`);
        append(`${total} tests, but only ${stats.tests} returned. ` +
               'Check for failed before/beforeEach-hooks (no `test end` is called for them ' +
               'and subsequent tests of the same suite are skipped), ' +
               'see https://github.com/mochajs/mocha/pull/1043');
      }
    });
  };

  const getURLParameter = (name) => (new URLSearchParams(location.search)).get(name);

  const absUrl = (url) => new URL(url, window.location.href).href;
  require.setRootURI(absUrl('../../javascripts/src'));
  require.setLibraryURI(absUrl('../../javascripts/lib'));
  require.setGlobalKeyPath('require');

  const Split = require('split-grid/dist/split-grid.min');
  new Split({
    columnGutters: [{
      track: 1,
      element: document.getElementById('separator'),
    }],
  });

  // This loads the test specs serially. While it is technically possible to load them in parallel,
  // the code would be very complex (it involves wrapping require.define(), configuring
  // require-kernel to use the wrapped .define() via require.setGlobalKeyPath(), and using the
  // asynchronous form of require()). In addition, the performance gains would be minimal because
  // require-kernel only loads 2 at a time by default. (Increasing the default could cause problems
  // because browsers like to limit the number of concurrent fetches.)
  for (const spec of await $.getJSON('frontendTestSpecs.json')) {
    const desc = spec
        .replace(/^ep_etherpad-lite\/tests\/frontend\/specs\//, '<core> ')
        .replace(/^([^/ ]*)\/static\/tests\/frontend\/specs\//, '<$1> ');
    describe(`${desc}.js`, function () { require(spec); });
  }

  await helper.init();
  const grep = getURLParameter('grep');
  if (grep != null) {
    mocha.grep(grep);
  }
  const runner = mocha.run();
  customRunner(runner);
})());
