$(function(){
  //allow cross iframe access
  if ((!$.browser.msie) && (!($.browser.mozilla && $.browser.version.indexOf("1.8.") == 0))) {
    document.domain = document.domain; // for comet
  }

  //initalize the test helper
  helper.init(function(){
	  //configure and start the test framework
	  //mocha.suite.timeout(5000);
	  mocha.ignoreLeaks();
		mocha.run();
  });
});