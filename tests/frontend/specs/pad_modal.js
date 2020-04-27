describe('Pad modal', function() {
  context('when modal is a "force reconnect" message', function() {
    var MODAL_SELECTOR = '#connectivity';

    beforeEach(function(done) {
      helper.newPad(function() {
        // force a "slowcommit" error
        helper.padChrome$.window.pad.handleChannelStateChange('DISCONNECTED', 'slowcommit');

        // wait for modal to be displayed
        var $modal = helper.padChrome$(MODAL_SELECTOR);
        helper.waitFor(function() {
          return $modal.hasClass('popup-show');
        }, 50000).done(done);
      });

      this.timeout(60000);
    });

    it('disables editor', function(done) {
      expect(isEditorDisabled()).to.be(true);

      done();
    });

    context('and user clicks on editor', function() {
      beforeEach(function() {
        clickOnPadInner();
      });

      it('does not close the modal', function(done) {
        var $modal = helper.padChrome$(MODAL_SELECTOR);
        var modalIsVisible = $modal.hasClass('popup-show');

        expect(modalIsVisible).to.be(true);

        done();
      });
    });

    context('and user clicks on pad outer', function() {
      beforeEach(function() {
        clickOnPadOuter();
      });

      it('does not close the modal', function(done) {
        var $modal = helper.padChrome$(MODAL_SELECTOR);
        var modalIsVisible = $modal.hasClass('popup-show');

        expect(modalIsVisible).to.be(true);

        done();
      });
    });
  });

  // we use "settings" here, but other modals have the same behaviour
  context('when modal is not an error message', function() {
    var MODAL_SELECTOR = '#settings';

    beforeEach(function(done) {
      helper.newPad(function() {
        openSettingsAndWaitForModalToBeVisible(done);
      });

      this.timeout(60000);
    });

    it('does not disable editor', function(done) {
      expect(isEditorDisabled()).to.be(false);
      done();
    });

    context('and user clicks on editor', function() {
      beforeEach(function() {
        clickOnPadInner();
      });

      it('closes the modal', function(done) {
        expect(isModalOpened(MODAL_SELECTOR)).to.be(false);
        done();
      });
    });

    context('and user clicks on pad outer', function() {
      beforeEach(function() {
        clickOnPadOuter();
      });

      it('closes the modal', function(done) {
        expect(isModalOpened(MODAL_SELECTOR)).to.be(false);
        done();
      });
    });
  });

  var clickOnPadInner = function() {
    var $editor = helper.padInner$('#innerdocbody');
    $editor.click();
  }

  var clickOnPadOuter = function() {
    var $lineNumbersColumn = helper.padOuter$('#sidedivinner');
    $lineNumbersColumn.click();
  }

  var openSettingsAndWaitForModalToBeVisible = function(done) {
    helper.padChrome$('.buttonicon-settings').click();

    // wait for modal to be displayed
    var modalSelector = '#settings';
    helper.waitFor(function() {
      return isModalOpened(modalSelector);
    }, 10000).done(done);
  }

  var isEditorDisabled = function() {
    var editorDocument = helper.padOuter$("iframe[name='ace_inner']").get(0).contentDocument;
    var editorBody     = editorDocument.getElementById('innerdocbody');

    var editorIsDisabled = editorBody.contentEditable === 'false' // IE/Safari
                        || editorDocument.designMode === 'off'; // other browsers

    return editorIsDisabled;
  }

  var isModalOpened = function(modalSelector) {
    var $modal = helper.padChrome$(modalSelector);

    return $modal.hasClass('popup-show');
  }
});
