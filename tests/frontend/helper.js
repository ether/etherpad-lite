var testHelper = {};

(function(){
	var $iframeContainer = $("#iframe-container"), $iframe;

	testHelper.randomString = function randomString(len)
	{
	  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	  var randomstring = '';
	  for (var i = 0; i < len; i++)
	  {
	    var rnum = Math.floor(Math.random() * chars.length);
	    randomstring += chars.substring(rnum, rnum + 1);
	  }
	  return randomstring;
	}

	testHelper.newPad = function(cb){
	  var padName = "FRONTEND_TEST_" + testHelper.randomString(20);
    $iframe = $("<iframe src='/p/" + padName + "'></iframe>")

	  $iframeContainer.empty().append($iframe);

    var checkInterval;
    $iframe.load(function(){
	    checkInterval = setInterval(function(){
	      var loaded = false;

	      try {
	      	//check if loading div is hidden
	        loaded = !testHelper.$getPadChrome().find("#editorloadingbox").is(":visible");
	      } catch(e){}

	      if(loaded){
	      	clearTimeout(timeout);
	        clearInterval(checkInterval);

	        cb(null, {name: padName});
	      }
	    }, 100);
	  });

    var timeout = setTimeout(function(){
    	if(checkInterval) clearInterval(checkInterval);
      cb(new Error("Pad didn't load in 10 seconds"));
    }, 10000);

	  return padName;
	}

	testHelper.$getPadChrome = function(){
		return $iframe.contents()
	}

	testHelper.$getPadOuter = function(){
		return testHelper.$getPadChrome().find('iframe.[name="ace_outer"]').contents();
	}

	testHelper.$getPadInner = function(){
    return testHelper.$getPadOuter().find('iframe.[name="ace_inner"]').contents();
	}

  // copied from http://stackoverflow.com/questions/985272/jquery-selecting-text-in-an-element-akin-to-highlighting-with-your-mouse
	testHelper.selectText = function(element){
    var doc = document, range, selection;

    if (doc.body.createTextRange) { //ms
        range = doc.body.createTextRange();
        range.moveToElementText(element);
        range.select();
    } else if (window.getSelection) { //all others
        selection = window.getSelection();        
        range = doc.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }
	}
})()

