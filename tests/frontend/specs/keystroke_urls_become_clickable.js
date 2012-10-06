describe("urls become clickable", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
  });

  it("adds a url and makes sure it's clickable", function(done) {
    var inner$ = helper.jQueryOf("inner"); 
    var chrome$ = helper.jQueryOf("chrome"); 
    
    //get the first text element out of the inner iframe
    var firstTextElement = inner$("div").first();
    
    // simulate key presses to delete content
    firstTextElement.sendkeys('{selectall}'); // select all
    firstTextElement.sendkeys('{del}'); // clear the first line
    firstTextElement.sendkeys('http://etherpad.org'); // insert a URL
	
    helper.waitFor(function(){
      //ace creates a new dom element when you press a keystroke, so just get the first text element again
      var newFirstTextElement = inner$("div").first();
      var locatedHref = newFirstTextElement.find("a");
      var isURL = locatedHref.length == 1; // if we found a URL and it is for etherpad.org

      //expect it to be bold
      expect(isURL).to.be(true);

      //it will only come to this point if the expect statement above doesn't throw
      done();
      return true;
    });
  });
});
