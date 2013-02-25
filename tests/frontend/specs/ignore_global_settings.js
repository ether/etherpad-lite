describe("ignoring global settings", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  // 1. Ignore global settings
  // 2. change linenumbers globally
  // 3. Un-Ingore global settings
  // 4. change author-colors
  // 5. Check for *same* linenumbers and *changed* author-colors
  it("tries to ignore global settings", function(done) {
    var outer$ = helper.padOuter$; 
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 

    this.timeout(15000);

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    //get the chat selector
    var $linesCheckbox = chrome$("#options-global-linenoscheck");
    var $colorsGlobalCheckbox = chrome$("#options-global-colorscheck");
    var $ignoreGlobalCheckbox = chrome$("#options-ignore-global");

    //get the current status of the linenumbers
    var oldValue_lines = outer$("#sidediv").hasClass("sidedivhidden");
    var oldValue_color = inner$("body").hasClass("authorColors");

    //ignore global settings
    $ignoreGlobalCheckbox.attr('selected','selected');
    $ignoreGlobalCheckbox.prop('checked', false); // make sure it's unchecked
    $ignoreGlobalCheckbox.change();
    $ignoreGlobalCheckbox.click(); // check it

    //change linenumbers
    $linesCheckbox.attr('selected','selected');
    $linesCheckbox.change();
    $linesCheckbox.click();

    // wait for the server-event to come..
    setTimeout(function() {
      //unignore global settings
      $ignoreGlobalCheckbox.attr('selected','selected');
      $ignoreGlobalCheckbox.change();
      $ignoreGlobalCheckbox.click();
      
      //change colors
      $colorsGlobalCheckbox.attr('selected','selected');
      $colorsGlobalCheckbox.change();
      $colorsGlobalCheckbox.click();
    }, 2500);

    helper.waitFor(function(){
      return inner$("body").hasClass("authorColors") == !oldValue_color;
    }, 10000).always(function(){
      var newValue_lines = outer$("#sidediv").hasClass("sidedivhidden");
      var newValue_color = inner$("body").hasClass("authorColors");
      
      expect(newValue_color).not.to.be(oldValue_color);
      expect(newValue_lines).to.be(oldValue_lines);
      done();
    });
  });
});
