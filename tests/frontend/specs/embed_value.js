describe("check embed links", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    testHelper.newPad(cb);
  });

  it("check embed links are sane", function() {
    //get the inner iframe
    var $inner = testHelper.$getPadInner();
    
    //get the embed button and click it
    var $embedButton = testHelper.$getPadChrome().find(".buttonicon-embed");
    $embedButton.click();

    //get the element
    var embedInput = testHelper.$getPadChrome().find("#embedinput");

    //is the embed drop down visible?
    var isVisible = $(embedInput).is(":visible");
    
    //expect it to be visible
    expect(isVisible).to.be(true);

    //does it contain "iframe"
    var containsIframe = embedInput.val().indexOf("iframe") != -1;

    //expect it to contain iframe
    expect(containsIframe).to.be(true);

    //does it contain "/iframe"
    var containsSlashIframe = embedInput.val().indexOf("/iframe") != -1;

    //expect it to contain /iframe
    expect(containsSlashIframe).to.be(true);



    //get the Read only button and click it
    var $embedButton = testHelper.$getPadChrome().find("#readonlyinput");
    $embedButton.click();

    //is the embed drop down visible?
    var isVisible = $(embedInput).is(":visible");

    //expect it to be visible
    expect(isVisible).to.be(true);

    //does it contain r.
    var containsRDot = embedInput.val().indexOf("r.") != -1;

    //expect it to contain iframe
    expect(containsRDot).to.be(true);

    //does it contain "iframe"
    var containsIframe = embedInput.val().indexOf("iframe") != -1;

    //expect it to contain iframe
    expect(containsIframe).to.be(true);

    //does it contain "/iframe"
    var containsSlashIframe = embedInput.val().indexOf("/iframe") != -1;

    //expect it to contain /iframe
    expect(containsSlashIframe).to.be(true);

  });
});
