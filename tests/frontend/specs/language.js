function deletecookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

describe("Language select and change", function(){
  // Destroy language cookies
  deletecookie("language", null);

  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  // Destroy language cookies
  it("makes text german", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //click the language button
    var $language = chrome$("#languagemenu");
    var $languageoption = $language.find("[value=de]");

    //select german
    $languageoption.attr('selected','selected');
    $language.change();

    helper.waitFor(function() {
      return chrome$(".buttonicon-bold").parent()[0]["title"] == "Fett (Strg-B)";
     })
    .done(function(){
      //get the value of the bold button
      var $boldButton = chrome$(".buttonicon-bold").parent();

      //get the title of the bold button
      var boldButtonTitle = $boldButton[0]["title"];

      //check if the language is now german
      expect(boldButtonTitle).to.be("Fett (Strg-B)");
      done();
    });
  });

  it("makes text English", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //click the language button
    var $language = chrome$("#languagemenu");
    //select english
    $language.val("en");
    $language.change();

    //get the value of the bold button
    var $boldButton = chrome$(".buttonicon-bold").parent();

    helper.waitFor(function() { return $boldButton[0]["title"] != "Fett (Strg+B)";})
    .done(function(){

      //get the value of the bold button
      var $boldButton = chrome$(".buttonicon-bold").parent();

      //get the title of the bold button
      var boldButtonTitle = $boldButton[0]["title"];

      //check if the language is now English
      expect(boldButtonTitle).to.be("Bold (Ctrl+B)");
      done();

    });
  });

  it("changes direction when picking an rtl lang", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //click the language button
    var $language = chrome$("#languagemenu");
    var $languageoption = $language.find("[value=ar]");

    //select arabic
    // $languageoption.attr('selected','selected'); // Breaks the test..
    $language.val("ar");
    $languageoption.change();

    helper.waitFor(function() {
      return chrome$("html")[0]["dir"] != 'ltr';
     })
    .done(function(){
      // check if the document's direction was changed
      expect(chrome$("html")[0]["dir"]).to.be("rtl");
      done();
    });
  });

  it("changes direction when picking an ltr lang", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //click the language button
    var $language = chrome$("#languagemenu");
    var $languageoption = $language.find("[value=en]");

    //select english
    //select arabic
    $languageoption.attr('selected','selected');
    $language.val("en");
    $languageoption.change();

    helper.waitFor(function() {
      return chrome$("html")[0]["dir"] != 'rtl';
     })
    .done(function(){
      // check if the document's direction was changed
      expect(chrome$("html")[0]["dir"]).to.be("ltr");
      done();
    });
  });
});
