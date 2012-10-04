describe("urls become clickable", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    testHelper.newPad(cb);
  });

  it("adds a url and makes sure it's clickable", function() {
    //get the inner iframe
    var $inner = testHelper.$getPadInner();
    
    //get the first text element out of the inner iframe
    var firstTextElement = $inner.find("div").first();
    
    // simulate key presses to delete content
    firstTextElement.sendkeys('{selectall}'); // select all
    firstTextElement.sendkeys('{del}'); // clear the first line
    firstTextElement.sendkeys('http://etherpad.org'); // add a url to the pad

    //ace creates a new dom element when you press a keystroke, so just get the first text element again
    var newFirstTextElement = $inner.find("div").first();

    // is there a url class now?
    var isURL = newFirstTextElement.find("href").length === 1;

    //expect it to be bold
    expect(isURL).to.be(true);

  });
});
