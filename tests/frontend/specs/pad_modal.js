describe('Pad modal', function () {
  context('when modal is a "force reconnect" message', function () {
    const MODAL_SELECTOR = '#connectivity';

    beforeEach(function (done) {
      helper.newPad(() => {
        // force a "slowcommit" error
        helper.padChrome$.window.pad.handleChannelStateChange('DISCONNECTED', 'slowcommit');

        // wait for modal to be displayed
        const $modal = helper.padChrome$(MODAL_SELECTOR);
        helper.waitFor(() => $modal.hasClass('popup-show'), 50000).done(done);
      });

      this.timeout(60000);
    });

    it('disables editor', function (done) {
      expect(isEditorDisabled()).to.be(true);

      done();
    });

    context('and user clicks on editor', function () {
      beforeEach(function () {
        clickOnPadInner();
      });

      it('does not close the modal', function (done) {
        const $modal = helper.padChrome$(MODAL_SELECTOR);
        const modalIsVisible = $modal.hasClass('popup-show');

        expect(modalIsVisible).to.be(true);

        done();
      });
    });

    context('and user clicks on pad outer', function () {
      beforeEach(function () {
        clickOnPadOuter();
      });

      it('does not close the modal', function (done) {
        const $modal = helper.padChrome$(MODAL_SELECTOR);
        const modalIsVisible = $modal.hasClass('popup-show');

        expect(modalIsVisible).to.be(true);

        done();
      });
    });
  });

  // we use "settings" here, but other modals have the same behaviour
  context('when modal is not an error message', function () {
    const MODAL_SELECTOR = '#settings';

    beforeEach(function (done) {
      helper.newPad(() => {
        openSettingsAndWaitForModalToBeVisible(done);
      });

      this.timeout(60000);
    });
    // This test breaks safari testing
    /*
    it('does not disable editor', function(done) {
      expect(isEditorDisabled()).to.be(false);
      done();
    });
*/
    context('and user clicks on editor', function () {
      beforeEach(function () {
        clickOnPadInner();
      });

      it('closes the modal', function (done) {
        expect(isModalOpened(MODAL_SELECTOR)).to.be(false);
        done();
      });
    });

    context('and user clicks on pad outer', function () {
      beforeEach(function () {
        clickOnPadOuter();
      });

      it('closes the modal', function (done) {
        expect(isModalOpened(MODAL_SELECTOR)).to.be(false);
        done();
      });
    });
  });

  var clickOnPadInner = function () {
    const $editor = helper.padInner$('#innerdocbody');
    $editor.click();
  };

  var clickOnPadOuter = function () {
    const $lineNumbersColumn = helper.padOuter$('#sidedivinner');
    $lineNumbersColumn.click();
  };

  var openSettingsAndWaitForModalToBeVisible = function (done) {
    helper.padChrome$('.buttonicon-settings').click();

    // wait for modal to be displayed
    const modalSelector = '#settings';
    helper.waitFor(() => isModalOpened(modalSelector), 10000).done(done);
  };

  var isEditorDisabled = function () {
    const editorDocument = helper.padOuter$("iframe[name='ace_inner']").get(0).contentDocument;
    const editorBody = editorDocument.getElementById('innerdocbody');

    const editorIsDisabled = editorBody.contentEditable === 'false' || // IE/Safari
                        editorDocument.designMode === 'off'; // other browsers

    return editorIsDisabled;
  };

  var isModalOpened = function (modalSelector) {
    const $modal = helper.padChrome$(modalSelector);

    return $modal.hasClass('popup-show');
  };
});
