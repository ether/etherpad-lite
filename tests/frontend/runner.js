$(function(){
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
    mocha.run();
  });
});
