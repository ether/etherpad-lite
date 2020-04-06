describe('Line wrapping ability to navigate through text and modify appropriately', function() {
  // create a new pad before each test run
  beforeEach(function(cb) {
    helper.newPad(cb);
    this.timeout(6000);
  });
  it('Tests line wrapping and caret positioning', function (done) {
    var chrome$ = helper.padChrome$;
    var inner$ = helper.padInner$;
    chrome$('#editorcontainer').css('width', '200px');

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //get the font menu and monospace option
    var $viewfontmenu = chrome$("#viewfontmenu");
    var $monospaceoption = $viewfontmenu.find("[value=monospace]");

    //select monospace and fire change event
    $monospaceoption.attr('selected','selected');
    $viewfontmenu.val("monospace");
    $viewfontmenu.change();
    $settingsButton.click();

    var textElement = inner$('div');
    textElement.sendkeys('{selectall}'); // select all
    textElement.sendkeys('{del}'); // clear the pad text
    const LONGSTRING = "Hello brave world I am gratefor for your cake";
    const TEST1 = "Hello brave worldY I am gratefor for your cake";
    const TEST2 = "Hello brave worldY  I am gratefor for your cake";
    inner$('div').first().text(LONGSTRING); // Put the text contents into the pad
    var firstLineText = inner$('div').first().text();
    helper.waitFor(function(){
      return expect(firstLineText.indexOf(LONGSTRING) === 0).to.be(true);
    }).done(function(){
      // Put caret after "world "
      helper.selectLines(inner$('div').first(), inner$('div').first(), 17, 17);
      var outer$ = helper.padOuter$;
      var $ace_outer = outer$('#outerdocbody').parent();
      $ace_outer.parent().scrollTop(0);
      var scrollTopFirefox = outer$('#outerdocbody').parent().scrollTop(); // works only on firefox
      // simulate a keypress of the right arrow key
      inner$('div').first().sendkeys('{rightarrow}');

      // caret should be after " " and before I
      // simulate a keypress of the left arrow key
      inner$('div').first().sendkeys('{leftarrow}');

      // caret should be after d and before " "
      // simulate a keypress of the Y key
      inner$('div').first().sendkeys('Y');

      // content should now be
      // Hello brave worldY I am gratefor for your cake
      expect(inner$('div').first().text() === TEST1).to.be(true);

      // now let's add a space bar character and ensure spaces are respected.
      // simulate a keypress of the space key
      inner$('div').first().sendkeys(' ');

      // Caret is now after "Y ", let's check the content
      // content should now be
      // Hello brave worldY I am gratefor for your cake
      expect(inner$('div').first().text() === TEST2).to.be(true);


      // Now we simulate our failure experience of going to position 16, back to 14 then forward to 16.
      // We will do that in a seperate test that can be ignored and test enabled once the proper fix lands

      done();
    });
  });

  // This fails in Firefox, see https://github.com/ether/etherpad-lite/issues/3087
  xit('Tests caret traversal over wrapped lines', function (done) {
    var chrome$ = helper.padChrome$;
    var inner$ = helper.padInner$;
    chrome$('#editorcontainer').css('width', '200px');

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //get the font menu and monospace option
    var $viewfontmenu = chrome$("#viewfontmenu");
    var $monospaceoption = $viewfontmenu.find("[value=monospace]");

    //select monospace and fire change event
    $monospaceoption.attr('selected','selected');
    $viewfontmenu.val("monospace");
    $viewfontmenu.change();
    $settingsButton.click();

    var textElement = inner$('div');
    textElement.sendkeys('{selectall}'); // select all
    textElement.sendkeys('{del}'); // clear the pad text
    const LONGSTRING = "Hello brave world I am gratefor for your cake";
    inner$('div').first().text(LONGSTRING); // Put the text contents into the pad
    var firstLineText = inner$('div').first().text();
    helper.waitFor(function(){
      return expect(firstLineText.indexOf(LONGSTRING) === 0).to.be(true);
    }).done(function(){
      // Put caret after "world "
      helper.selectLines(inner$('div').first(), inner$('div').first(), 18, 18);
      var outer$ = helper.padOuter$;
      var $ace_outer = outer$('#outerdocbody').parent();
      $ace_outer.parent().scrollTop(0);
      var scrollTopFirefox = outer$('#outerdocbody').parent().scrollTop(); // works only on firefox

      // Now we simulate our failure experience of going to position 16, back to 14 then forward to 16.
      // We will do that in a seperate test that can be ignored and test enabled once the proper fix lands

      // using sendkeys doesn't actually trigger the failure event and we can't use browser to send keystrokes
      // any more, see: https://stackoverflow.com/a/19883789/695411

      // This means writing tests for this are impossible without an OS passing the arrow keys
      // Afaik Selenium or so can do this?

      setTimeout(function(){
        inner$('div').first().sendkeys('{leftarrow}');

      setTimeout(function(){
        inner$('div').first().sendkeys('{rightarrow}');
        //caret should now be before "I "
        inner$('div').first().sendkeys('{rightarrow}');
        //caret should now be before "I "

      setTimeout(function(){
        inner$('div').first().sendkeys('{leftarrow}');
        inner$('div').first().sendkeys('{leftarrow}');
        //caret should now be before "I "
        inner$('div').first().sendkeys('{rightarrow}');
        inner$('div').first().sendkeys('{rightarrow}');
        //caret should now be after "I"

      }, 1000);

      }, 1000);

      }, 1000);

      done();
    });
  });

});

  var pressAndReleaseRightArrow = function() {
    pressKey(RIGHT_ARROW);
    releaseKey(RIGHT_ARROW);
  };


  var pressKey = function(keyCode, shiftIsPressed){
    var inner$ = helper.padInner$;

    /*
     * These events use keydown and up, not keypress.
     * Do not change. Changing to keypress will break Edge.
     */
    var e = inner$('#innerdocbody').first().Event("keydown");
    inner$('#innerdocbody').first().focus();

    e.shiftKey = false;
    e.keyCode = keyCode;
    e.which = keyCode; // etherpad listens to 'which'
console.warn("trigger");
    inner$('#innerdocbody').first().trigger(e);
//    inner$.on("custom", function(event, param){
 //     console.warn(event, param);
//    });
  };

  var releaseKey = function(keyCode){
    var inner$ = helper.padInner$;

    /*
     * These events use keydown and up, not keypress.
     * Do not change. Changing to keypress will break Edge.
     */
    inner$('#innerdocbody').first().focus();
    var e = inner$('#innerdocbody').first().Event("keyup");

    e.keyCode = keyCode;
    e.which = keyCode; // etherpad listens to 'which'
    inner$('#innerdocbody').first().trigger(e);
  };

 var LEFT_ARROW = 37;
  var UP_ARROW = 38;
  var RIGHT_ARROW = 39;
