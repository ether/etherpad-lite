describe("All the alphabet works n stuff", function(){
  var expectedString = "abcdefghijklmnopqrstuvwxyz";

  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  it("when you enter any char it appears right", function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    //get the first text element out of the inner iframe
    var firstTextElement = inner$("div").first();

    // simulate key presses to delete content
    firstTextElement.sendkeys('{selectall}'); // select all
    firstTextElement.sendkeys('{del}'); // clear the first line

    let code;
    for (let index = 0; index < expectedString.length; index++){
      code = expectedString.charCodeAt(index);
      $(firstTextElement).trigger({type: 'keydown', which: code});
      $(firstTextElement).trigger({type: 'keypress', which: code});
      $(firstTextElement).trigger({type: 'keyup', which: code});
    }

    helper.waitFor(function(){
      return inner$("div").first().text() === expectedString;
    }, 2000).done(done);
  });

});
