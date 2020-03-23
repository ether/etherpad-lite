describe("indentation button", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

 it("indent text with keypress", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //get the first text element out of the inner iframe
    var $firstTextElement = inner$("div").first();

    //select this text element
    $firstTextElement.sendkeys('{selectall}');

    var e = inner$.Event(helper.evtType);
    e.keyCode = 9; // tab :|
    inner$("#innerdocbody").trigger(e);

    helper.waitFor(function(){
      return inner$("div").first().find("ul li").length === 1;
    }).done(done);
  });

  it("indent text with button", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    var $indentButton = chrome$(".buttonicon-indent");
    $indentButton.click();

    helper.waitFor(function(){
      return inner$("div").first().find("ul li").length === 1;
    }).done(done);
  });

  it("keeps the indent on enter for the new line", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    var $indentButton = chrome$(".buttonicon-indent");
    $indentButton.click();

    //type a bit, make a line break and type again
    var $firstTextElement = inner$("div span").first();
    $firstTextElement.sendkeys('line 1');
    $firstTextElement.sendkeys('{enter}');
    $firstTextElement.sendkeys('line 2');
    $firstTextElement.sendkeys('{enter}');

    helper.waitFor(function(){
      return inner$("div span").first().text().indexOf("line 2") === -1;
    }).done(function(){
      var $newSecondLine = inner$("div").first().next();
      var hasULElement = $newSecondLine.find("ul li").length === 1;

      expect(hasULElement).to.be(true);
      expect($newSecondLine.text()).to.be("line 2");
      done();
    });
  });

  it("indents text with spaces on enter if previous line ends with ':', '[', '(', or '{'", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //type a bit, make a line break and type again
    var $firstTextElement = inner$("div").first();
    $firstTextElement.sendkeys("line with ':'{enter}");
    $firstTextElement.sendkeys("line with '['{enter}");
    $firstTextElement.sendkeys("line with '('{enter}");
    $firstTextElement.sendkeys("line with '{{}'{enter}");

    helper.waitFor(function(){
      // wait for Etherpad to split four lines into separated divs
      var $fourthLine = inner$("div").first().next().next().next();
      return $fourthLine.text().indexOf("line with '{'") === 0;
    }).done(function(){
      // we validate bottom to top for easier implementation

      // curly braces
      var $lineWithCurlyBraces = inner$("div").first().next().next().next();
      $lineWithCurlyBraces.sendkeys('{{}');
      pressEnter(); // cannot use sendkeys('{enter}') here, browser does not read the command properly
      var $lineAfterCurlyBraces = inner$("div").first().next().next().next().next();
      expect($lineAfterCurlyBraces.text()).to.match(/\s{4}/); // tab === 4 spaces

      // parenthesis
      var $lineWithParenthesis = inner$("div").first().next().next();
      $lineWithParenthesis.sendkeys('(');
      pressEnter();
      var $lineAfterParenthesis = inner$("div").first().next().next().next();
      expect($lineAfterParenthesis.text()).to.match(/\s{4}/);

      // bracket
      var $lineWithBracket = inner$("div").first().next();
      $lineWithBracket.sendkeys('[');
      pressEnter();
      var $lineAfterBracket = inner$("div").first().next().next();
      expect($lineAfterBracket.text()).to.match(/\s{4}/);

      // colon
      var $lineWithColon = inner$("div").first();
      $lineWithColon.sendkeys(':');
      pressEnter();
      var $lineAfterColon = inner$("div").first().next();
      expect($lineAfterColon.text()).to.match(/\s{4}/);

      done();
    });
  });

  it("appends indentation to the indent of previous line if previous line ends with ':', '[', '(', or '{'", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //type a bit, make a line break and type again
    var $firstTextElement = inner$("div").first();
    $firstTextElement.sendkeys("  line with some indentation and ':'{enter}");
    $firstTextElement.sendkeys("line 2{enter}");

    helper.waitFor(function(){
      // wait for Etherpad to split two lines into separated divs
      var $secondLine = inner$("div").first().next();
      return $secondLine.text().indexOf("line 2") === 0;
    }).done(function(){
      var $lineWithColon = inner$("div").first();
      $lineWithColon.sendkeys(':');
      pressEnter();
      var $lineAfterColon = inner$("div").first().next();
      expect($lineAfterColon.text()).to.match(/\s{6}/); // previous line indentation + regular tab (4 spaces)

      done();
    });
  });

  it("issue #2772 shows '*' when multiple indented lines receive a style and are outdented", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    // make sure pad has more than one line
    inner$("div").first().sendkeys("First{enter}Second{enter}");
    helper.waitFor(function(){
      return inner$("div").first().text().trim() === "First";
    }).done(function(){
      // indent first 2 lines
      var $lines = inner$("div");
      var $firstLine = $lines.first();
      var $secondLine = $lines.slice(1,2);
      helper.selectLines($firstLine, $secondLine);

      var $indentButton = chrome$(".buttonicon-indent");
      $indentButton.click();

      helper.waitFor(function(){
        return inner$("div").first().find("ul li").length === 1;
      }).done(function(){
        // apply bold
        var $boldButton = chrome$(".buttonicon-bold");
        $boldButton.click();

        helper.waitFor(function(){
          return inner$("div").first().find("b").length === 1;
        }).done(function(){
          // outdent first 2 lines
          var $outdentButton = chrome$(".buttonicon-outdent");
          $outdentButton.click();
          helper.waitFor(function(){
            return inner$("div").first().find("ul li").length === 0;
          }).done(function(){
            // check if '*' is displayed
            var $secondLine = inner$("div").slice(1,2);
            expect($secondLine.text().trim()).to.be("Second");

            done();
          });
        });
      });
    });
  });

  /*

  it("makes text indented and outdented", function() {

    //get the inner iframe
    var $inner = testHelper.$getPadInner();

    //get the first text element out of the inner iframe
    var firstTextElement = $inner.find("div").first();

    //select this text element
    testHelper.selectText(firstTextElement[0], $inner);

    //get the indentation button and click it
    var $indentButton = testHelper.$getPadChrome().find(".buttonicon-indent");
    $indentButton.click();

    //ace creates a new dom element when you press a button, so just get the first text element again
    var newFirstTextElement = $inner.find("div").first();

    // is there a list-indent class element now?
    var firstChild = newFirstTextElement.children(":first");
    var isUL = firstChild.is('ul');

    //expect it to be the beginning of a list
    expect(isUL).to.be(true);

    var secondChild = firstChild.children(":first");
    var isLI = secondChild.is('li');
    //expect it to be part of a list
    expect(isLI).to.be(true);

    //indent again
    $indentButton.click();

    var newFirstTextElement = $inner.find("div").first();

    // is there a list-indent class element now?
    var firstChild = newFirstTextElement.children(":first");
    var hasListIndent2 = firstChild.hasClass('list-indent2');

    //expect it to be part of a list
    expect(hasListIndent2).to.be(true);

    //make sure the text hasn't changed
    expect(newFirstTextElement.text()).to.eql(firstTextElement.text());


    // test outdent

    //get the unindentation button and click it twice
    var $outdentButton = testHelper.$getPadChrome().find(".buttonicon-outdent");
    $outdentButton.click();
    $outdentButton.click();

    //ace creates a new dom element when you press a button, so just get the first text element again
    var newFirstTextElement = $inner.find("div").first();

    // is there a list-indent class element now?
    var firstChild = newFirstTextElement.children(":first");
    var isUL = firstChild.is('ul');

    //expect it not to be the beginning of a list
    expect(isUL).to.be(false);

    var secondChild = firstChild.children(":first");
    var isLI = secondChild.is('li');
    //expect it to not be part of a list
    expect(isLI).to.be(false);

    //make sure the text hasn't changed
    expect(newFirstTextElement.text()).to.eql(firstTextElement.text());


    // Next test tests multiple line indentation

    //select this text element
    testHelper.selectText(firstTextElement[0], $inner);

    //indent twice
    $indentButton.click();
    $indentButton.click();

    //get the first text element out of the inner iframe
    var firstTextElement = $inner.find("div").first();

    //select this text element
    testHelper.selectText(firstTextElement[0], $inner);

    /* this test creates the below content, both should have double indentation
    line1
    line2


    firstTextElement.sendkeys('{rightarrow}'); // simulate a keypress of enter
    firstTextElement.sendkeys('{enter}'); // simulate a keypress of enter
    firstTextElement.sendkeys('line 1'); // simulate writing the first line
    firstTextElement.sendkeys('{enter}'); // simulate a keypress of enter
    firstTextElement.sendkeys('line 2'); // simulate writing the second line

    //get the second text element out of the inner iframe
    setTimeout(function(){ // THIS IS REALLY BAD
      var secondTextElement = $('iframe').contents().find('iframe').contents().find('iframe').contents().find('body > div').get(1); // THIS IS UGLY

      // is there a list-indent class element now?
      var firstChild = secondTextElement.children(":first");
      var isUL = firstChild.is('ul');

      //expect it to be the beginning of a list
      expect(isUL).to.be(true);

      var secondChild = secondChild.children(":first");
      var isLI = secondChild.is('li');
      //expect it to be part of a list
      expect(isLI).to.be(true);

      //get the first text element out of the inner iframe
      var thirdTextElement = $('iframe').contents().find('iframe').contents().find('iframe').contents().find('body > div').get(2); // THIS IS UGLY TOO

      // is there a list-indent class element now?
      var firstChild = thirdTextElement.children(":first");
      var isUL = firstChild.is('ul');

      //expect it to be the beginning of a list
      expect(isUL).to.be(true);

      var secondChild = firstChild.children(":first");
      var isLI = secondChild.is('li');

      //expect it to be part of a list
      expect(isLI).to.be(true);
    },1000);
  });*/

});

function pressEnter(){
  var inner$ = helper.padInner$;
  var e = inner$.Event(helper.evtType);
  e.keyCode = 13; // enter :|
  inner$("#innerdocbody").trigger(e);
}
