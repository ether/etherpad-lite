describe("urls", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(5000);
  });

  it("when you enter an url, it becomes clickable", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 
    
    //get the first text element out of the inner iframe
    var firstTextElement = inner$("div").first();
    
    // simulate key presses to delete content
    firstTextElement.sendkeys('{selectall}'); // select all
    firstTextElement.sendkeys('{del}'); // clear the first line
    firstTextElement.sendkeys('http://etherpad.org'); // insert a URL
	  
    helper.waitFor(function(){
      return inner$("div").first().find("a").length === 1;
    }, 2000).done(done);
  });
});
