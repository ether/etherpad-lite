describe('timeslider follow', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
  });

  it("content as it's added to timeslider", async function () {
    // send 6 revisions
    const revs = 6;
    const message = 'a\n\n\n\n\n\n\n\n\n\n';
    const newLines = message.split('\n').length;
    for (let i = 0; i < revs; i++) {
      await helper.edit(message, newLines * i + 1);
    }

    await helper.gotoTimeslider(0);
    await helper.waitForPromise(() => helper.contentWindow().location.hash === '#0');

    const originalTop = helper.contentWindow().$('#innerdocbody').offset();

    // set to follow contents as it arrives
    helper.contentWindow().$('#options-followContents').prop('checked', true);
    helper.contentWindow().$('#playpause_button_icon').click();

    let newTop;
    return helper.waitForPromise(() => {
      newTop = helper.contentWindow().$('#innerdocbody').offset();
      return newTop.top < originalTop.top;
    });
  });

  /**
   * Tests for bug described in #4389
   * The goal is to scroll to the first line that contains a change right before
   * the change is applied.
   *
   */
  it('only to lines that exist in the current pad view, see #4389', async function () {
    // Select everything and clear via delete key
    const e = helper.padInner$.Event(helper.evtType);
    e.keyCode = 8; // delete key
    const lines = helper.linesDiv();
    helper.selectLines(lines[0], lines[lines.length - 1]); // select all lines
    // probably unnecessary, but wait for the selection to be Range not Caret
    await helper.waitForPromise(() => !helper.padInner$.document.getSelection().isCollapsed,
        // only supported in FF57+
        // return helper.padInner$.document.getSelection().type === 'Range';
    );
    helper.padInner$('#innerdocbody').trigger(e);
    await helper.waitForPromise(() => helper.commits.length === 1);
    await helper.edit('Test line\n\n');
    await helper.edit('Another test line', 3);

    await helper.gotoTimeslider();

    // set to follow contents as it arrives
    helper.contentWindow().$('#options-followContents').prop('checked', true);

    const oldYPosition = helper.contentWindow().$('#editorcontainerbox')[0].scrollTop;
    expect(oldYPosition).to.be(0);

    /**
     * pad content rev 0 [default Pad text]
     * pad content rev 1 ['']
     * pad content rev 2 ['Test line','','']
     * pad content rev 3 ['Test line','','Another test line']
     */

    // line 3 changed
    helper.contentWindow().$('#leftstep').click();
    await helper.waitForPromise(() => hasFollowedToLine(3));

    // line 1 is the first line that changed
    helper.contentWindow().$('#leftstep').click();
    await helper.waitForPromise(() => hasFollowedToLine(1));

    // line 1 changed
    helper.contentWindow().$('#leftstep').click();
    await helper.waitForPromise(() => hasFollowedToLine(1));

    // line 1 changed
    helper.contentWindow().$('#rightstep').click();
    await helper.waitForPromise(() => hasFollowedToLine(1));

    // line 1 is the first line that changed
    helper.contentWindow().$('#rightstep').click();
    await helper.waitForPromise(() => hasFollowedToLine(1));

    // line 3 changed
    helper.contentWindow().$('#rightstep').click();
    return helper.waitForPromise(() => hasFollowedToLine(3));
  });
});

/**
 * @param {number} lineNum
 * @returns {boolean} scrolled to the lineOffset?
 */
function hasFollowedToLine(lineNum) {
  const scrollPosition = helper.contentWindow().$('#editorcontainerbox')[0].scrollTop;
  const lineOffset = helper.contentWindow().$('#innerdocbody').find(`div:nth-child(${lineNum})`)[0].offsetTop;

  return Math.abs(scrollPosition - lineOffset) < 1;
}
