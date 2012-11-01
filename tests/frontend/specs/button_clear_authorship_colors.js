describe("clear authorship colors button", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("makes text clear authorship colors", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 

    // override the confirm dialogue functioon
    helper.padChrome$.window.confirm = function(){
      return true;
    }

    //get the first text element out of the inner iframe
    var $firstTextElement = inner$("div").first();

    // Get the original text
    var originalText = inner$("div").first().text();
    
    // Set some new text
    var sentText = "Hello";

    //select this text element
    $firstTextElement.sendkeys(sentText);

    helper.waitFor(function(){
      return inner$("div").first().text() === sentText + originalText; // wait until we have the full value available
    }).done(function(){
      // does the first divs span include an author class?
      var hasAuthorClass = inner$("div span").first().attr("class").indexOf("author") !== -1;
      expect(hasAuthorClass).to.be(true);

      //get the clear authorship colors button and click it
      var $clearauthorshipcolorsButton = chrome$(".buttonicon-clearauthorship");
      $clearauthorshipcolorsButton.click();

      // does the first divs span include an author class?
      var hasAuthorClass = inner$("div span").first().attr("class").indexOf("author") !== -1;
      expect(hasAuthorClass).to.be(false);

      // does the first div include an author class?
      var hasAuthorClass = inner$("div").first().attr("class").indexOf("author") !== -1;
      expect(hasAuthorClass).to.be(false);

      done();
    });

  });
});
