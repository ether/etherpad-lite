var helper = {};

(function(){
  var $iframeContainer, $iframe, jsLibraries = {};

  helper.init = function(cb){
    $iframeContainer = $("#iframe-container");

    $.get('/static/js/jquery.js').done(function(code){ 
      // make sure we don't override existing jquery
      jsLibraries["jquery"] = "if(typeof $ === 'undefined') {\n" + code + "\n}";

      $.get('/tests/frontend/lib/sendkeys.js').done(function(code){ 
        jsLibraries["sendkeys"] = code;

        cb();
      });
    });
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

  var getFrameJQuery = function($iframe){
    /*
      I tried over 9000 ways to inject javascript into iframes. 
      This is the only way I found that worked in IE 7+8+9, FF and Chrome
    */

    var win = $iframe[0].contentWindow;
    var doc = win.document;

    //IE 8+9 Hack to make eval appear
    //http://stackoverflow.com/questions/2720444/why-does-this-window-object-not-have-the-eval-function
    win.execScript && win.execScript("null");

    win.eval(jsLibraries["jquery"]);
    win.eval(jsLibraries["sendkeys"]);
    
    win.$.window = win;
    win.$.document = doc;

    return win.$;
  }

  helper.clearCookies = function(){
    window.document.cookie = "";
  }

  helper.newPad = function(cb, padName){
    //build opts object
    var opts = {clearCookies: true}
    if(typeof cb === 'function'){
      opts.cb = cb
    } else {
      opts = _.defaults(cb, opts);
    }

    //clear cookies
    if(opts.clearCookies){
      helper.clearCookies();
    }

    if(!padName)
      padName = "FRONTEND_TEST_" + helper.randomString(20);
    $iframe = $("<iframe src='/p/" + padName + "'></iframe>");
    
    //clean up inner iframe references
    helper.padChrome$ = helper.padOuter$ = helper.padInner$ = null;

    //clean up iframes properly to prevent IE from memoryleaking
    $iframeContainer.find("iframe").purgeFrame().done(function(){
      $iframeContainer.append($iframe);
      $iframe.one('load', function(){  
        helper.waitFor(function(){
          return !$iframe.contents().find("#editorloadingbox").is(":visible");
        }, 50000).done(function(){
          helper.padChrome$ = getFrameJQuery(                $('#iframe-container iframe'));
          helper.padOuter$  = getFrameJQuery(helper.padChrome$('iframe[name="ace_outer"]'));
          helper.padInner$  = getFrameJQuery( helper.padOuter$('iframe[name="ace_inner"]'));

          //disable all animations, this makes tests faster and easier
          helper.padChrome$.fx.off = true;
          helper.padOuter$.fx.off = true;
          helper.padInner$.fx.off = true;
          
          opts.cb();
        }).fail(function(){
          throw new Error("Pad never loaded");
        });
      });
    }); 

    return padName;
  }

  helper.waitFor = function(conditionFunc, _timeoutTime, _intervalTime){
    var timeoutTime = _timeoutTime || 1000;
    var intervalTime = _intervalTime || 10;

    var deferred = $.Deferred();
    
    var _fail = deferred.fail;
    var listenForFail = false;
    deferred.fail = function(){
      listenForFail = true;
      _fail.apply(this, arguments);
    }

    var intervalCheck = setInterval(function(){
      var passed = false;

      passed = conditionFunc();

      if(passed){
        clearInterval(intervalCheck);
        clearTimeout(timeout);

        deferred.resolve();
      }
    }, intervalTime);

    var timeout = setTimeout(function(){
      clearInterval(intervalCheck);
      var error = new Error("wait for condition never became true " + conditionFunc.toString());
      deferred.reject(error);

      if(!listenForFail){
        throw error;
      }
    }, timeoutTime);

    return deferred;
  }

  /* Ensure console.log doesn't blow up in IE, ugly but ok for a test framework imho*/
  window.console = window.console || {};
  window.console.log = window.console.log || function(){}

  //force usage of callbacks in it
  var _it = it;
  it = function(name, func){
    if(func && func.length !== 1){
      func = function(){
        throw new Error("Please use always a callback with it() - " + func.toString());
      }
    }

    _it(name, func);
  }
})()