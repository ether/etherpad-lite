var helper = {};

(function(){
  var $iframeContainer, $iframe, $padChrome, $padOuter, $padInner;

  helper.init = function(){
    $iframeContainer = $("#iframe-container");
  }

  helper.randomString = function randomString(len)
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

  var getFrameJQuery = function($, selector, callback){
    //find the iframe and get its window and document
    var $iframe = $(selector);
    var $content = $iframe.contents();
    var win = $iframe[0].contentWindow;
    var doc = win.document;

    //inject jquery if not already existing
    if(win.$ === undefined){
      helper.injectJS(doc, "/static/js/jquery.js");
    }

    helper.waitFor(function(){
      return win.$ 
    }).then(function(){
      if(!(win.$ && win.$.fn && win.$.fn.sendkeys)){
        helper.injectJS(doc, "/tests/frontend/sendkeys.js");
      }

      helper.waitFor(function(){
        return (win.$ && win.$.fn && win.$.fn.sendkeys);
      }).then(function(){
        win.$.window = win;
        win.$.document = doc;

        callback(win.$);
      });
    });
  }

  helper.newPad = function(cb){
    var padName = "FRONTEND_TEST_" + helper.randomString(20);
    $iframe = $("<iframe src='/p/" + padName + "'></iframe>");

    $iframeContainer.empty().append($iframe);

    var checkInterval;
    $iframe.load(function(){
      helper.waitFor(function(){
        return !$iframe.contents().find("#editorloadingbox").is(":visible");
      }).then(function(){
        //INCEPTION!!!
        getFrameJQuery($, '#iframe-container iframe', function(_$padChrome){
          $padChrome = _$padChrome;

          getFrameJQuery($padChrome, 'iframe.[name="ace_outer"]', function(_$padOuter){
            $padOuter = _$padOuter;

            getFrameJQuery($padOuter, 'iframe.[name="ace_inner"]', function(_$padInner){
              $padInner = _$padInner;

              cb();
            });
          });
        })
      });
    });

    return padName;
  }

  //helper to inject javascript
  helper.injectJS = function(doc, url){
    var script = doc.createElement( 'script' );
    script.type = 'text/javascript';
    script.src = url;
    doc.body.appendChild(script);
  }

  helper.waitFor = function(conditionFunc, _timeoutTime, _intervalTime){
    var timeoutTime = _timeoutTime || 1000;
    var intervalTime = _intervalTime || 10;
    
    var callback = function(){}
    var returnObj = { then: function(_callback){ 
      callback = _callback;
    }}

    var intervalCheck = setInterval(function(){
      var passed = conditionFunc();

      if(passed){
        clearInterval(intervalCheck);
        clearTimeout(timeout);

        callback(passed);
      }
    }, intervalTime);

    var timeout = setTimeout(function(){
      clearInterval(intervalCheck);
      throw Error("wait for condition never became true");
    }, timeoutTime);

    return returnObj;
  }

  helper.log = function(){
    if(console && console.log){
      console.log.apply(console, arguments);
    }
  }

  helper.jQueryOf = function(name){
    switch(name){
      case "chrome":
        return $padChrome;
        break;
      case "outer":
        return $padOuter;
        break;
      case "inner":
        return $padInner;
        break;
    }
  } 
})()

