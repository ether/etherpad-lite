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
  });
  // JM commented out on 8th Sep 2020 for a release, after release this needs uncommenting
  // And the test needs to be fixed to work in Firefox 52 on Windows 7.  I am not sure why it fails on this specific platform
  // The errors show this.timeout... then crash the browser but I am sure something is actually causing the stack trace and
  // I just need to narrow down what, offers to help accepted.
  it('Fast response to keypress in pad with large amount of contents', function(done) {
    var start = Date.now(); // get the start time

    // send some new text to the screen (ensure all 3 key events are sent)
    var el = helper.padInner$('div').first();
    for(var i = 0; i < 300; ++i) {
      var x = "0".charCodeAt(0);
      ['keyup', 'keypress', 'keydown'].forEach(function(type) {
        var e = $.Event(type);
        e.keyCode = x;
        el.trigger(e);
      });
    }
    var end = Date.now(); // get the current time
    var delay = end - start; // get the delay as the current time minus the start time

    expect(delay).to.be.below(1);
    done();
  })
});
