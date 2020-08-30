$(function(){

  function stringifyException(exception){
    var err = exception.stack || exception.toString();

    // FF / Opera do not add the message
    if (!~err.indexOf(exception.message)) {
      err = exception.message + '\n' + err;
    }

    // <=IE7 stringifies to [Object Error]. Since it can be overloaded, we
    // check for the result of the stringifying.
    if ('[object Error]' == err) err = exception.message;

    // Safari doesn't give you a stack. Let's at least provide a source line.
    if (!exception.stack && exception.sourceURL && exception.line !== undefined) {
      err += "\n(" + exception.sourceURL + ":" + exception.line + ")";
    }

    return err;
  }

  function CustomRunner(runner) {
    var stats = { suites: 0, tests: 0, passes: 0, pending: 0, failures: 0 };

    if (!runner) return;

    runner.on('start', function(){
      stats.start = new Date;
    });

    runner.on('suite', function(suite){
      suite.root || stats.suites++;
      if (suite.root) return;
      append(suite.title);
      level++;
    });

    runner.on('suite end', function(suite){
      if (suite.root) return;
      level--;

      if(level == 0) {
        append("");
      }
    });

    // Scroll down test display after each test
    let mochaEl = $('#mocha')[0];
    runner.on('test', function(){
      mochaEl.scrollTop = mochaEl.scrollHeight;
    });

    // max time a test is allowed to run
    // TODO this should be lowered once timeslider_revision.js is faster
    var killTimeout;
    runner.on('test end', function(){
      stats.tests++;
    });

    runner.on('pass', function(test){
      if(killTimeout) clearTimeout(killTimeout);
      killTimeout = setTimeout(function(){
        append("FINISHED - [red]no test started since 3 minutes, tests stopped[clear]");
      }, 60000 * 3);

      var medium = test.slow() / 2;
      test.speed = test.duration > test.slow()
        ? 'slow'
        : test.duration > medium
          ? 'medium'
          : 'fast';

      stats.passes++;
      append("->","[green]PASSED[clear] :", test.title," ",test.duration,"ms");
    });

    runner.on('fail', function(test, err){
      if(killTimeout) clearTimeout(killTimeout);
      killTimeout = setTimeout(function(){
        append("FINISHED - [red]no test started since 3 minutes, tests stopped[clear]");
      }, 60000 * 3);

      stats.failures++;
      test.err = err;
      append("->","[red]FAILED[clear] :", test.title, stringifyException(test.err));
    });

    runner.on('pending', function(test){
      if(killTimeout) clearTimeout(killTimeout);
      killTimeout = setTimeout(function(){
        append("FINISHED - [red]no test started since 3 minutes, tests stopped[clear]");
      }, 60000 * 3);

      stats.pending++;
      append("->","[yellow]PENDING[clear]:", test.title);
    });

    var $console = $("#console");
      var level = 0;
      var append = function(){
        var text = Array.prototype.join.apply(arguments, [" "]);
        var oldText = $console.text();

        var space = "";
        for(var i=0;i<level*2;i++){
          space+=" ";
        }

        var splitedText = "";
        _(text.split("\n")).each(function(line){
          while(line.length > 0){
            var split = line.substr(0,100);
            line = line.substr(100);
            if(splitedText.length > 0) splitedText+="\n";
            splitedText += split;
          }
        });

        //indent all lines with the given amount of space
        var newText = _(splitedText.split("\n")).map(function(line){
          return space + line;
        }).join("\\n");

        $console.text(oldText + newText + "\\n");
      }

      var total = runner.total;
      runner.on('end', function(){
        stats.end = new Date;
        stats.duration = stats.end - stats.start;
        var minutes = Math.floor(stats.duration / 1000 / 60);
        var seconds = Math.round((stats.duration / 1000) % 60) // chrome < 57 does not like this .toString().padStart("2","0");
        if(stats.tests === total){
          append("FINISHED -", stats.passes, "tests passed,", stats.failures, "tests failed,", stats.pending," pending, duration: " + minutes + ":" + seconds);
        } else if (stats.tests > total) {
          append("FINISHED - but more tests than planned returned", stats.passes, "tests passed,", stats.failures, "tests failed,", stats.pending," pending, duration: " + minutes + ":" + seconds);
          append(total,"tests, but",stats.tests,"returned. There is probably a problem with your async code or error handling, see https://github.com/mochajs/mocha/issues/1327");
        }
        else {
          append("FINISHED - but not all tests returned", stats.passes, "tests passed,", stats.failures, "tests failed,", stats.pending, "tests pending, duration: " + minutes + ":" + seconds);
          append(total,"tests, but only",stats.tests,"returned. Check for failed before/beforeEach-hooks (no `test end` is called for them and subsequent tests of the same suite are skipped), see https://github.com/mochajs/mocha/pull/1043");
        }
      });
  }

  //http://stackoverflow.com/questions/1403888/get-url-parameter-with-jquery
  var getURLParameter = function (name) {
    return decodeURI(
        (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
    );
  }

  //get the list of specs and filter it if requested
  var specs = specs_list.slice();

  //inject spec scripts into the dom
  var $body = $('body');
  $.each(specs, function(i, spec){
    if(spec[0] != "/"){ // if the spec isn't a plugin spec which means the spec file might be in a different subfolder
      $body.append('<script src="specs/' + spec + '"></script>')
    }else{
      $body.append('<script src="' + spec + '"></script>')
    }
  });

  //initalize the test helper
  helper.init(function(){
    //configure and start the test framework
    var grep = getURLParameter("grep");
    if(grep != "null"){
      mocha.grep(grep);
    }

    var runner = mocha.run();
    CustomRunner(runner)
  });
});
