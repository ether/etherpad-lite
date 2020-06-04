describe("change user color", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("Color picker matches original color and remembers the user color after a refresh", function(done) {
    this.timeout(60000);
    var chrome$ = helper.padChrome$;

    //click on the settings button to make settings visible
    var $userButton = chrome$(".buttonicon-showusers");
    $userButton.click();

    var $userSwatch = chrome$("#myswatch");
    $userSwatch.click();

    var fb = chrome$.farbtastic('#colorpicker')
    var $colorPickerSave = chrome$("#mycolorpickersave");
    var $colorPickerPreview = chrome$("#mycolorpickerpreview");

    // Same color represented in two different ways
    const testColorHash = '#abcdef'
    const testColorRGB = 'rgb(171, 205, 239)'

    // Check that the color picker matches the automatically assigned random color on the swatch.
    // NOTE: This has a tiny chance of creating a false positive for passing in the
    // off-chance the randomly assigned color is the same as the test color.
    expect($colorPickerPreview.css('background-color')).to.be($userSwatch.css('background-color'))

    // The swatch updates as the test color is picked.
    fb.setColor(testColorHash)
    expect($colorPickerPreview.css('background-color')).to.be(testColorRGB)
    $colorPickerSave.click();
    expect($userSwatch.css('background-color')).to.be(testColorRGB)

    setTimeout(function(){ //give it a second to save the color on the server side
      helper.newPad({ // get a new pad, but don't clear the cookies
        clearCookies: false
        , cb: function(){
          var chrome$ = helper.padChrome$;

          //click on the settings button to make settings visible
          var $userButton = chrome$(".buttonicon-showusers");
          $userButton.click();

          var $userSwatch = chrome$("#myswatch");
          $userSwatch.click();

          var $colorPickerPreview = chrome$("#mycolorpickerpreview");

          expect($colorPickerPreview.css('background-color')).to.be(testColorRGB)
          expect($userSwatch.css('background-color')).to.be(testColorRGB)

          done();
        }
      });
    }, 1000);
  });

  it("Own user color is shown when you enter a chat", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    var $colorOption = helper.padChrome$('#options-colorscheck');
    if (!$colorOption.is(':checked')) {
      $colorOption.click();
    }

    //click on the settings button to make settings visible
    var $userButton = chrome$(".buttonicon-showusers");
    $userButton.click();

    var $userSwatch = chrome$("#myswatch");
    $userSwatch.click();

    var fb = chrome$.farbtastic('#colorpicker')
    var $colorPickerSave = chrome$("#mycolorpickersave");

    // Same color represented in two different ways
    const testColorHash = '#abcdef'
    const testColorRGB = 'rgb(171, 205, 239)'

    fb.setColor(testColorHash)
    $colorPickerSave.click();

    //click on the chat button to make chat visible
    var $chatButton = chrome$("#chaticon");
    $chatButton.click();
    var $chatInput = chrome$("#chatinput");
    $chatInput.sendkeys('O hi'); // simulate a keypress of typing user
    $chatInput.sendkeys('{enter}'); // simulate a keypress of enter actually does evt.which = 10 not 13

    //check if chat shows up
    helper.waitFor(function(){
      return chrome$("#chattext").children("p").length !== 0; // wait until the chat message shows up
    }).done(function(){
      var $firstChatMessage = chrome$("#chattext").children("p");
      expect($firstChatMessage.css('background-color')).to.be(testColorRGB); // expect the first chat message to be of the user's color
      done();
    });
  });
});
