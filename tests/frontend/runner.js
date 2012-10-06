$(function(){
  //allow cross iframe access
  document.domain = document.domain;

  //initalize the test helper
  helper.init();

  //configure and start the test framework
  mocha.timeout(5000);
  mocha.ignoreLeaks();
	mocha.run();
});