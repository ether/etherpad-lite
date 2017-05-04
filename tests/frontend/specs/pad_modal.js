describe('Pad modal', function() {
  var padId, $originalPadFrame;

  beforeEach(function(done) {
    padId = helper.newPad(function() {
      // open same pad on another iframe, to force userdup error
      var $otherIframeWithSamePad = $('<iframe src="/p/' + padId + '" style="height: 1px;"></iframe>');
      $originalPadFrame = $('#iframe-container iframe');
      $otherIframeWithSamePad.insertAfter($originalPadFrame);

      // wait for modal to be displayed
      var $errorMessageModal = helper.padChrome$('#connectivity .userdup');
      helper.waitFor(function() {
        return $errorMessageModal.is(':visible');
      }, 50000).done(done);
    });

    this.timeout(60000);
  });

  it('disables editor', function(done) {
    var editorDocument = helper.padOuter$("iframe[name='ace_inner']").get(0).contentDocument;
    var editorBody     = editorDocument.getElementById('innerdocbody');

    var editorIsEditable = editorBody.contentEditable === 'false' // IE/Safari
                        || editorDocument.designMode === 'off'; // other browsers

    expect(editorIsEditable).to.be(true);

    done();
  });

  context('and user clicks on editor', function() {
    beforeEach(function() {
      var $editor = helper.padInner$('#innerdocbody');
      $editor.click();
    });

    it('closes the modal', function(done) {
      var $errorMessageModal = helper.padChrome$('#connectivity .userdup');
      var modalIsVisible = $errorMessageModal.is(':visible');

      expect(modalIsVisible).to.be(false);

      done();
    });
  });

  context('and user clicks on pad outer', function() {
    beforeEach(function() {
      var $lineNumbersColumn = helper.padOuter$('#sidedivinner');
      $lineNumbersColumn.click();
    });

    it('closes the modal', function(done) {
      var $errorMessageModal = helper.padChrome$('#connectivity .userdup');
      var modalIsVisible = $errorMessageModal.is(':visible');

      expect(modalIsVisible).to.be(false);

      done();
    });
  });
});
