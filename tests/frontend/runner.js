$(function(){
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
	  //mocha.suite.timeout(5000);
    var grep = getURLParameter("grep");
    if(grep != "null"){
      mocha.grep(grep);
    }
	  mocha.ignoreLeaks();
		mocha.run();
  });
});