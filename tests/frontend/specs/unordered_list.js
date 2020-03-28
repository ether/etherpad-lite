describe("assign unordered list", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("insert unordered list text then removes by outdent", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;
    var originalText = inner$("div").first().text();

    var $insertunorderedlistButton = chrome$(".buttonicon-insertunorderedlist");
    $insertunorderedlistButton.click();

    helper.waitFor(function(){
      var newText = inner$("div").first().text();
      if(newText === originalText){
        return inner$("div").first().find("ul li").length === 1;
      }
    }).done(function(){

      // remove indentation by bullet and ensure text string remains the same
      chrome$(".buttonicon-outdent").click();
      helper.waitFor(function(){
        var newText = inner$("div").first().text();
        return (newText === originalText);
      }).done(function(){
        done();
      });

    });
  });

});

describe("unassign unordered list", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("insert unordered list text then remove by clicking list again", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;
    var originalText = inner$("div").first().text();

    var $insertunorderedlistButton = chrome$(".buttonicon-insertunorderedlist");
    $insertunorderedlistButton.click();

    helper.waitFor(function(){
      var newText = inner$("div").first().text();
      if(newText === originalText){
        return inner$("div").first().find("ul li").length === 1;
      }
    }).done(function(){

      // remove indentation by bullet and ensure text string remains the same
      $insertunorderedlistButton.click();
      helper.waitFor(function(){
        var isList = inner$("div").find("ul").length === 1;
        // sohuldn't be list
        return (isList === false);
      }).done(function(){
        done();
      });

    });
  });
});


describe("keep unordered list on enter key", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("Keeps the unordered list on enter for the new line", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    var $insertorderedlistButton = chrome$(".buttonicon-insertunorderedlist");
    $insertorderedlistButton.click();

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
      console.log($newSecondLine.find("ul").length);
      expect(hasULElement).to.be(true);
      expect($newSecondLine.text()).to.be("line 2");
      done();
    });
  });

});
