describe('author of pad edition', function() {
  // author 1 creates a new pad with some content (regular lines and lists)
  before(function(done) {
    var padId = helper.newPad(function() {
      // make sure pad has at least 3 lines
      var $firstLine = helper.padInner$('div').first();
      $firstLine.html("Hello World");

      // wait for lines to be processed by Etherpad
      helper.waitFor(function() {
        return $firstLine.text() === 'Hello World';
      }).done(function() {
        // Reload pad, to make changes as a second user. Need a timeout here to make sure
        // all changes were saved before reloading
        setTimeout(function() {
          // Expire cookie, so author is changed after reloading the pad.
          // See https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie#Example_4_Reset_the_previous_cookie
          helper.padChrome$.document.cookie = 'token=foo;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

          helper.newPad(done, padId);
        }, 1000);
      });
    });
    this.timeout(60000);
  });

  // author 2 makes some changes on the pad
  it('Clears Authorship by second user', function(done) {
    clearAuthorship(done);
  });

  var clearAuthorship = function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    // override the confirm dialogue functioon
    helper.padChrome$.window.confirm = function(){
      return true;
    }

    //get the clear authorship colors button and click it
    var $clearauthorshipcolorsButton = chrome$(".buttonicon-clearauthorship");
    $clearauthorshipcolorsButton.click();

    // does the first divs span include an author class?
    var hasAuthorClass = inner$("div span").first().attr("class").indexOf("author") !== -1;

    expect(hasAuthorClass).to.be(false)
    done();
  }
});
