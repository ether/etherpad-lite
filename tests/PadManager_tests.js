var padManager = require("../node/PadManager");

/**
 * Tests if new Pads a created with the correct inital values
 */
exports.createAPad = function(test)
{
  test.expect(7);

  //Test if PadManager gives null when a Pad don't exist and you don't wish to create it
  var pad = padManager.getPad("test", false);
  test.equal(pad, null, "The PadManager gives a value for a pad that was never created'");
  
  //Test if PadManager creates a Pad with the correct id when you want to create it
  pad = padManager.getPad("test", true);
  test.equal(pad.id, "test", "The PadManager gave a pad with a other id than expeted");
  
  //Test if the startText is correct set
  var atext = pad.atext;
  test.equal(atext.text, padManager.startText + "\n", "The Starttext of a Pad is wrong set");

  //Test if the atext().text and text() is the same
  test.equal(atext.text, pad.text(), "pad.atext.text is not pad.text()");

  //Test if the Revision Number is Zero
  var head = pad.getHeadRevisionNumber();
  test.equal(head, 0, "The Revision Number is not zero!");
  
  //Check if the first Author is a empty String
  var firstAuthor = pad.getRevisionAuthor(0);
  test.equal(firstAuthor, '', "The Author of the First Revision is not a empty String");
  
  var firstChangeset = pad.getRevisionChangeset(0);
  test.ok(firstChangeset.indexOf(padManager.startText) > -1, "The first Changeset does not contain the inital Text");
  
  test.done();
}
