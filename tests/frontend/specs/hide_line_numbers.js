describe("hiding linenumbers", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("hides the linenumbers locally", function(done) {
    var outer$ = helper.padOuter$; 
    var chrome$ = helper.padChrome$; 

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //get the chat selector
    var $linesCheckbox = chrome$("#options-linenoscheck");
    
    //get the current status of the linenumbers
    var oldValue = outer$("#sidediv").hasClass("sidedivhidden");

    //select show linenumbers and fire change event
    $linesCheckbox.attr('selected','selected');
    $linesCheckbox.change();
    $linesCheckbox.click();
    
    //get the current status of the linenumbers
    var newValue = outer$("#sidediv").hasClass("sidedivhidden");
    
    expect(oldValue).not.to.be(newValue);
    expect(newValue).to.be(!$linesCheckbox.prop("checked"));

    done();
  });

  it("hides the linenumbers globally", function(done) {
    var outer$ = helper.padOuter$; 
    var chrome$ = helper.padChrome$; 
    
    this.timeout(10000);

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //get the chat selector
    var $linesCheckbox = chrome$("#options-global-linenoscheck");

    //get the current status of the linenumbers
    var oldValue = outer$("#sidediv").hasClass("sidedivhidden");

    //select show linenumbers and fire change event
    $linesCheckbox.attr('selected','selected');
    $linesCheckbox.change();
    $linesCheckbox.click();
    
    helper.waitFor(function(){
      return outer$("#sidediv").hasClass("sidedivhidden") == !oldValue;
    }, 10000).always(function(){
      var newValue = outer$("#sidediv").hasClass("sidedivhidden");
      expect(oldValue).not.to.be(newValue);
      expect(newValue).to.be(!$linesCheckbox.prop("checked"));
      done();
    });
  });
});
