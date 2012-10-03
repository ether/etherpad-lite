$(function(){
  //allow cross iframe access
  document.domain = document.domain;

  //initalize the test helper
  testHelper.init();

  //configure and start the test framework
  mocha.ignoreLeaks();
	mocha.run();
});