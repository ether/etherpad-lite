describe('clear authorship colors and clear as second user', function() {
  // author 1 creates a new pad with some content
  before(function(done) {
    var padId = helper.newPad(function() {

      it("makes text as one user and clears as another", function(done) {
        var inner$ = helper.padInner$;
        var chrome$ = helper.padChrome$;

        // override the confirm dialogue functioon
        helper.padChrome$.window.confirm = function(){
          return true;
        }

        //get the first text element out of the inner iframe
        var $firstTextElement = inner$("div").first();

        // Get the original text
        var originalText = inner$("div").first().text();

        // Set some new text
        var sentText = "Hello";

        //select this text element
        $firstTextElement.sendkeys('{selectall}');
        $firstTextElement.sendkeys(sentText);
        $firstTextElement.sendkeys('{rightarrow}');

        helper.waitFor(function() {
          return ($firstTextElement.text() === sentText);
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
    });
  });
});
