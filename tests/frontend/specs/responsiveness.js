// Test for https://github.com/ether/etherpad-lite/issues/1763

// This test fails in Opera, IE and Safari
// Opera fails due to a weird way of handling the order of execution, yet actual performance seems fine
// Safari fails due the delay being too great yet the actual performance seems fine
// Firefox might panic that the script is taking too long so will fail
// IE will fail due to running out of memory as it can't fit 2M chars in memory.

// Just FYI Google Docs crashes on large docs whilst trying to Save, it's likely the limitations we are
// experiencing are more to do with browser limitations than improper implementation.
// A ueber fix for this would be to have a separate lower cpu priority thread that handles operations that aren't
// visible to the user.

// Adapted from John McLear's original test case.

describe('Responsiveness of Editor', function() {
  // create a new pad before each test run
  beforeEach(function(cb) {
    helper.newPad(cb);
    this.timeout(6000);
  });
  it('Fast response to keypress in pad with large amount of contents', function(done) {
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;
    var chars = '0000000000'; // row of placeholder chars
    var amount = 200000; //number of blocks of chars we will insert
    var length = (amount * (chars.length) +1); // include a counter for each space
    var text = ''; // the text we're gonna insert
    this.timeout(amount * 100);

    // get keys to send
    var keyMultiplier = 10; // multiplier * 10 == total number of key events
    var keysToSend = '';
    for(var i=0; i <= keyMultiplier; i++) {
      keysToSend += chars;
    }

    var textElement = inner$('div');
    textElement.sendkeys('{selectall}'); // select all
    textElement.sendkeys('{del}'); // clear the pad text

    for(var i=0; i <= amount; i++) {
      text = text + chars + ' '; // add the chars and space to the text contents
    }
    inner$('div').first().text(text); // Put the text contents into the pad

    helper.waitFor(function(){ // Wait for the new contents to be on the pad
      return inner$('div').text().length > length;
    }).done(function(){

      expect( inner$('div').text().length ).to.be.greaterThan( length ); // has the text changed?
      var start = new Date().getTime(); // get the start time

      // send some new text to the screen (ensure all 3 key events are sent)
      var el = inner$('div').first();
      for(var i = 0; i < keysToSend.length; ++i) {
        var x = keysToSend.charCodeAt(i);
        ['keyup', 'keypress', 'keydown'].forEach(function(type) {
          var e = $.Event(type);
          e.keyCode = x;
          el.trigger(e);
        });
      }

      helper.waitFor(function(){ // Wait for the ability to process
        return true; // Ghetto but works for now
      }).done(function(){
        var end = new Date().getTime(); // get the current time
        var delay = end - start; // get the delay as the current time minus the start time

        console.log('delay:', delay);
        expect(delay).to.be.below(200);
        done();
      }, 1000);

    }, 10000);
  });

});

