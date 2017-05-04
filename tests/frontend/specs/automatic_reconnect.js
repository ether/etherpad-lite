describe('Automatic pad reload on Force Reconnect message', function() {
  var padId, $originalPadFrame;

  beforeEach(function(done) {
    padId = helper.newPad(function() {
      // enable userdup error to have timer to force reconnect
      var $errorMessageModal = helper.padChrome$('#connectivity .userdup');
      $errorMessageModal.addClass('with_reconnect_timer');

      // make sure there's a timeout set, otherwise automatic reconnect won't be enabled
      helper.padChrome$.window.clientVars.automaticReconnectionTimeout = 2;

      // open same pad on another iframe, to force userdup error
      var $otherIframeWithSamePad = $('<iframe src="/p/' + padId + '" style="height: 1px;"></iframe>');
      $originalPadFrame = $('#iframe-container iframe');
      $otherIframeWithSamePad.insertAfter($originalPadFrame);

      // wait for modal to be displayed
      helper.waitFor(function() {
        return $errorMessageModal.is(':visible');
      }, 50000).done(done);
    });

    this.timeout(60000);
  });

  it('displays a count down timer to automatically reconnect', function(done) {
    var $errorMessageModal = helper.padChrome$('#connectivity .userdup');
    var $countDownTimer = $errorMessageModal.find('.reconnecttimer');

    expect($countDownTimer.is(':visible')).to.be(true);

    done();
  });

  context('and user clicks on Cancel', function() {
    beforeEach(function() {
      var $errorMessageModal = helper.padChrome$('#connectivity .userdup');
      $errorMessageModal.find('#cancelreconnect').click();
    });

    it('does not show Cancel button nor timer anymore', function(done) {
      var $errorMessageModal = helper.padChrome$('#connectivity .userdup');
      var $countDownTimer = $errorMessageModal.find('.reconnecttimer');
      var $cancelButton = $errorMessageModal.find('#cancelreconnect');

      expect($countDownTimer.is(':visible')).to.be(false);
      expect($cancelButton.is(':visible')).to.be(false);

      done();
    });
  });

  context('and user does not click on Cancel until timer expires', function() {
    var padWasReloaded = false;

    beforeEach(function() {
      $originalPadFrame.one('load', function() {
        padWasReloaded = true;
      });
    });

    it('reloads the pad', function(done) {
      helper.waitFor(function() {
        return padWasReloaded;
      }, 5000).done(done);

      this.timeout(5000);
    });
  });
});
