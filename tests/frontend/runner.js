$(function(){
  function Base(runner) {
    var self = this
      , stats = this.stats = { suites: 0, tests: 0, passes: 0, pending: 0, failures: 0 }
      , failures = this.failures = [];

    if (!runner) return;
    this.runner = runner;

    runner.on('start', function(){
      stats.start = new Date;
    });

    runner.on('suite', function(suite){
      stats.suites = stats.suites || 0;
      suite.root || stats.suites++;
    });

    runner.on('test end', function(test){
      stats.tests = stats.tests || 0;
      stats.tests++;
    });

    runner.on('pass', function(test){
      stats.passes = stats.passes || 0;

      var medium = test.slow() / 2;
      test.speed = test.duration > test.slow()
        ? 'slow'
        : test.duration > medium
          ? 'medium'
          : 'fast';

      stats.passes++;
    });

    runner.on('fail', function(test, err){
      stats.failures = stats.failures || 0;
      stats.failures++;
      test.err = err;
      failures.push(test);
    });

    runner.on('end', function(){
      stats.end = new Date;
      stats.duration = new Date - stats.start;
    });

    runner.on('pending', function(){
      stats.pending++;
    });
  }

  /*
    This reporter wraps the original html reporter plus reports plain text into a hidden div. 
    This allows the webdriver client to pick up the test results
  */
  var WebdriverAndHtmlReporter = function(html_reporter){
    return function(runner){
      Base.call(this, runner);

      // Scroll down test display after each test
      mocha = $('#mocha')[0];
      runner.on('test', function(){
        mocha.scrollTop = mocha.scrollHeight;
      });

      //initalize the html reporter first
      html_reporter(runner);

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

      runner.on('suite', function(suite){
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

      var stringifyException = function(exception){
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

      var killTimeout;
      runner.on('test end', function(test){
        if ('passed' == test.state) {
          append("->","[green]PASSED[clear] :", test.title);
        } else if (test.pending) {
          append("->","[yellow]PENDING[clear]:", test.title);
        } else {
          append("->","[red]FAILED[clear] :", test.title, stringifyException(test.err));
        }

        if(killTimeout) clearTimeout(killTimeout);
        killTimeout = setTimeout(function(){
          append("FINISHED - [red]no test started since 3 minutes, tests stopped[clear]");
        }, 60000 * 3);
      });

      var total = runner.total;
      runner.on('end', function(){
        if(stats.tests >= total){
          var minutes = Math.floor(stats.duration / 1000 / 60);
          var seconds = Math.round((stats.duration / 1000) % 60);

          append("FINISHED -", stats.passes, "tests passed,", stats.failures, "tests failed, duration: " + minutes + ":" + seconds);
        }
      });
    }
  }

  //allow cross iframe access
  var browser = bowser;
  if ((!browser.msie) && (!(browser.mozilla && browser.version.indexOf("1.8.") == 0))) {
    document.domain = document.domain; // for comet
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

    mocha.ignoreLeaks();

    mocha.reporter(WebdriverAndHtmlReporter(mocha._reporter));

    mocha.run();
  });
});       
