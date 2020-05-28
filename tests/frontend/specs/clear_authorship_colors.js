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
    $firstTextElement.sendkeys('{selectall}');
    $firstTextElement.sendkeys(sentText);
    $firstTextElement.sendkeys('{rightarrow}');

    helper.waitFor(function(){
      return inner$("div span").first().attr("class").indexOf("author") !== -1; // wait until we have the full value available
    }).done(function(){
      //IE hates you if you don't give focus to the inner frame bevore you do a clearAuthorship
      inner$("div").first().focus();

      //get the clear authorship colors button and click it
      var $clearauthorshipcolorsButton = chrome$(".buttonicon-clearauthorship");
      $clearauthorshipcolorsButton.click();

      // does the first divs span include an author class?
      console.log(inner$("div span").first().attr("class"));
      var hasAuthorClass = inner$("div span").first().attr("class").indexOf("author") !== -1;
      //expect(hasAuthorClass).to.be(false);

      // does the first div include an author class?
      var hasAuthorClass = inner$("div").first().attr("class").indexOf("author") !== -1;
      expect(hasAuthorClass).to.be(false);

      setTimeout(function(){
        var disconnectVisible = chrome$("div.disconnected").attr("class").indexOf("visible") === -1
        expect(disconnectVisible).to.be(true);
      },1000);

      done();
    });

  });

  it("makes text clear authorship colors and checks it can't be undone", function(done) {
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
    $firstTextElement.sendkeys('{selectall}');
    $firstTextElement.sendkeys(sentText);
    $firstTextElement.sendkeys('{rightarrow}');

    helper.waitFor(function(){
      return inner$("div span").first().attr("class").indexOf("author") !== -1; // wait until we have the full value available
    }).done(function(){
      //IE hates you if you don't give focus to the inner frame bevore you do a clearAuthorship
      inner$("div").first().focus();

      //get the clear authorship colors button and click it
      var $clearauthorshipcolorsButton = chrome$(".buttonicon-clearauthorship");
      $clearauthorshipcolorsButton.click();

      // does the first divs span include an author class?
      console.log(inner$("div span").first().attr("class"));
      var hasAuthorClass = inner$("div span").first().attr("class").indexOf("author") !== -1;
      //expect(hasAuthorClass).to.be(false);

      // does the first div include an author class?
      var hasAuthorClass = inner$("div").first().attr("class").indexOf("author") !== -1;
      expect(hasAuthorClass).to.be(false);

      var e = inner$.Event(helper.evtType);
      e.ctrlKey = true; // Control key
      e.which = 90; // z
      inner$("#innerdocbody").trigger(e); // shouldn't od anything

      // does the first div include an author class?
      hasAuthorClass = inner$("div").first().attr("class").indexOf("author") !== -1;
      expect(hasAuthorClass).to.be(false);

      // get undo and redo buttons
      var $undoButton = chrome$(".buttonicon-undo");

      // click the button
      $undoButton.click(); // shouldn't do anything
      hasAuthorClass = inner$("div").first().attr("class").indexOf("author") !== -1;
      expect(hasAuthorClass).to.be(false);


      setTimeout(function(){
        var disconnectVisible = chrome$("div.disconnected").attr("class").indexOf("visible") === -1
        expect(disconnectVisible).to.be(true);
      },1000);

      done();
    });

  });
});

