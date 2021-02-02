'use strict';

describe('Automatic pad reload on Force Reconnect message', function () {
  let padId, $originalPadFrame;

  beforeEach(function (done) {
    padId = helper.newPad(() => {
      // enable userdup error to have timer to force reconnect
      const $errorMessageModal = helper.padChrome$('#connectivity .userdup');
      $errorMessageModal.addClass('with_reconnect_timer');

      // make sure there's a timeout set, otherwise automatic reconnect won't be enabled
      helper.padChrome$.window.clientVars.automaticReconnectionTimeout = 2;

      // open same pad on another iframe, to force userdup error
      const $otherIframeWithSamePad = $(`<iframe src="/p/${padId}" style="height: 1px;"></iframe>`);
      $originalPadFrame = $('#iframe-container iframe');
      $otherIframeWithSamePad.insertAfter($originalPadFrame);

      // wait for modal to be displayed
      helper.waitFor(() => $errorMessageModal.is(':visible'), 50000).done(done);
    });

    this.timeout(60000);
  });

  it('displays a count down timer to automatically reconnect', function (done) {
    const $errorMessageModal = helper.padChrome$('#connectivity .userdup');
    const $countDownTimer = $errorMessageModal.find('.reconnecttimer');

    expect($countDownTimer.is(':visible')).to.be(true);

    done();
  });

  context('and user clicks on Cancel', function () {
    beforeEach(async function () {
      const $errorMessageModal = helper.padChrome$('#connectivity .userdup');
      $errorMessageModal.find('#cancelreconnect').click();
      await helper.waitForPromise(
          () => helper.padChrome$('#connectivity .userdup').is(':visible') === true);
    });

    it('does not show Cancel button nor timer anymore', function (done) {
      const $errorMessageModal = helper.padChrome$('#connectivity .userdup');
      const $countDownTimer = $errorMessageModal.find('.reconnecttimer');
      const $cancelButton = $errorMessageModal.find('#cancelreconnect');

      expect($countDownTimer.is(':visible')).to.be(false);
      expect($cancelButton.is(':visible')).to.be(false);

      done();
    });
  });

  context('and user does not click on Cancel until timer expires', function () {
    let padWasReloaded = false;

    beforeEach(async function () {
      $originalPadFrame.one('load', () => {
        padWasReloaded = true;
      });
    });

    it('reloads the pad', function (done) {
      helper.waitFor(() => padWasReloaded, 10000).done(done);

      this.timeout(10000);
    });
  });
});
