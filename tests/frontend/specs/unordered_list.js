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
