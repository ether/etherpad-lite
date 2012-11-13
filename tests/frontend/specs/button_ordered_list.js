describe("assign ordered list", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("insert ordered list text", function(done){
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$;

    var $insertorderedlistButton = chrome$(".buttonicon-insertorderedlist");
    $insertorderedlistButton.click();

    helper.waitFor(function(){
      return inner$("div").first().find("ol li").length === 1;
    }).done(done);
  });

  xit("issue #1125 keeps the numbered list on enter for the new line - EMULATES PASTING INTO A PAD", function(done){
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$;

    var $insertorderedlistButton = chrome$(".buttonicon-insertorderedlist");
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
      var hasOLElement = $newSecondLine.find("ol li").length === 1;
      console.log($newSecondLine.find("ol"));
      expect(hasOLElement).to.be(true);
      expect($newSecondLine.text()).to.be("line 2");
      var hasLineNumber = $newSecondLine.find("ol").attr("start") === 2;
      expect(hasLineNumber).to.be(true); // This doesn't work because pasting in content doesn't work
      done();
    });
  });
});
