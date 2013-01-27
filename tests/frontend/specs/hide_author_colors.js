describe("hiding author-colors", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("hides the author-colors locally", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //get the chat selector
    var $colorsCheckbox = chrome$("#options-colorscheck");

    //get the current status of the author-colors
    var oldValue = inner$("body").hasClass("authorColors");

    //select show author colors and fire change event
    $colorsCheckbox.attr('selected','selected');
    $colorsCheckbox.change();
    $colorsCheckbox.click();
    
    //get the current status of the author-colors
    var newValue = inner$("body").hasClass("authorColors");

    expect(oldValue).not.to.be(newValue);
    expect(newValue).to.be($colorsCheckbox.prop("checked"));

    done();
  });

  it("hides the author-colors globally", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 
    
    this.timeout(10000);

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //get the chat selector
    var $colorsCheckbox = chrome$("#options-global-colorscheck");

    //get the current status of the author-colors
    var oldValue = inner$("body").hasClass("authorColors");

    //select show author colors and fire change event
    $colorsCheckbox.attr('selected','selected');
    $colorsCheckbox.change();
    $colorsCheckbox.click();
    
    helper.waitFor(function(){
      return inner$("body").hasClass("authorColors") == !oldValue;
    }, 10000).always(function(){
      var newValue = inner$("body").hasClass("authorColors");
      expect(oldValue).not.to.be(newValue);
      expect(newValue).to.be($colorsCheckbox.prop("checked"));
      done();
    });
  });
});
