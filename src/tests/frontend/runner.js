'use strict';

/* global specs_list */

$(() => {
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

    runner.on('start', () => {
      stats.start = new Date();
    });

    runner.on('suite', (suite) => {
      suite.root || stats.suites++;
      if (suite.root) return;
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

    // Scroll down test display after each test
    const mochaEl = $('#mocha')[0];
    runner.on('test', () => {
      mochaEl.scrollTop = mochaEl.scrollHeight;
    });

    // max time a test is allowed to run
    // TODO this should be lowered once timeslider_revision.js is faster
    let killTimeout;
    runner.on('test end', () => {
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
      const oldText = $console.text();

      let space = '';
      for (let i = 0; i < level * 2; i++) {
        space += ' ';
      }

      let splitedText = '';
      _(text.split('\n')).each((line) => {
        while (line.length > 0) {
          const split = line.substr(0, 100);
          line = line.substr(100);
          if (splitedText.length > 0) splitedText += '\n';
          splitedText += split;
        }
      });

      // indent all lines with the given amount of space
      const newText = _(splitedText.split('\n')).map((line) => space + line).join('\\n');

      $console.text(`${oldText + newText}\\n`);
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

  // get the list of specs and filter it if requested
  const specs = specs_list.slice();

  // inject spec scripts into the dom
  const $body = $('body');
  $.each(specs, (i, spec) => {
    // if the spec isn't a plugin spec which means the spec file might be in a different subfolder
    if (!spec.startsWith('/')) {
      $body.append(`<script src="specs/${spec}"></script>`);
    } else {
      $body.append(`<script src="${spec}"></script>`);
    }
  });

  // initialize the test helper
  helper.init(() => {
    // configure and start the test framework
    const grep = getURLParameter('grep');
    if (grep != null) {
      mocha.grep(grep);
    }

    const runner = mocha.run();
    customRunner(runner);
  });
});
