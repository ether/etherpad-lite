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
  // @todo also do this with 30k+ lines
  it('Fast response to keypress in pad with large amount of contents', function(done) {
    var inner$ = helper.padInner$;
    var chars = '0000000000'; // row of placeholder chars
    var amount = 100000; //number of blocks of chars we will insert
    var length = (amount * (chars.length) +1); // include a counter for each space
    var text = ''; // the text we're gonna insert
    this.timeout(amount * 100);

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

      var start = Date.now(); // get the start time
      var newLength = inner$('div').text().length;

      // send abc to the end of the first line
      var el = inner$('div').first();
      el.sendkeys('abc');

      helper.waitFor(function(){ // Wait for the ability to process
        return newLength == inner$('div').text().length - 3;
      }).done(function(){
        var end = Date.now(); // get the current time
        var delay = end - start; // get the delay as the current time minus the start time

        expect(delay).to.be.below(300);
        done();
      }, 1000);

    }, 10000);
  });

});

