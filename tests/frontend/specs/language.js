describe("Language select and change", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });
 
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
 
    helper.waitFor(function() { return $language.val() == "de"})
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
    var $languageoption = $language.find("[value=en]");
 
    //select german
    $languageoption.attr('selected','selected');
    $language.change();
 
    helper.waitFor(function() { return $language.val() == "en";})
    .done(function(){
 
      //get the value of the bold button
      var $boldButton = chrome$(".buttonicon-bold").parent();
 
      //get the title of the bold button
      var boldButtonTitle = $boldButton[0]["title"];
 
      //check if the language is now English
      expect(boldButtonTitle).to.be("Bold (Ctrl-B)");
      done();
 
    });
  });
 
});