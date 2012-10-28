$(function(){
  /*
    This reporter wraps the original html reporter plus reports plain text into a hidden div. 
    This allows the webdriver client to pick up the test results
  */
  var WebdriverAndHtmlReporter = function(html_reporter){
    return function(runner){
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

        //indent all lines with the given amount of space
        var newText = _(text.split("\n")).map(function(line){
          return space + line;
        }).join("\n");

        $console.text(oldText + newText + "\n");
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

      runner.on('test end', function(test){
        if ('passed' == test.state) {
          append("->","PASSED :", test.title);
        } else if (test.pending) {
          append("->","PENDING:", test.title);
        } else {
          var err = test.err.stack || test.err.toString();

          // FF / Opera do not add the message
          if (!~err.indexOf(test.err.message)) {
            err = test.err.message + '\n' + err;
          }

          // <=IE7 stringifies to [Object Error]. Since it can be overloaded, we
          // check for the result of the stringifying.
          if ('[object Error]' == err) err = test.err.message;

          // Safari doesn't give you a stack. Let's at least provide a source line.
          if (!test.err.stack && test.err.sourceURL && test.err.line !== undefined) {
            err += "\n(" + test.err.sourceURL + ":" + test.err.line + ")";
          }

          append("->","FAILED :", test.title, err);
        }
      });

      runner.on('end', function(){
        append("FINISHED");
      });
    }
  }

  //allow cross iframe access
  if ((!$.browser.msie) && (!($.browser.mozilla && $.browser.version.indexOf("1.8.") == 0))) {
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
    $body.append('<script src="specs/' + spec + '"></script>')
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