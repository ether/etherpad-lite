describe("Leave Pad Functionality", function () {
  beforeEach(async function () {
      await helper.newPad(); // Open a new pad before each test
  });

  it("should leave the pad and go back to the homepage", async function () {
      await helper.leavePad(); // Clicks the exit button
      expect(window.location.pathname).toBe("/"); // Confirms we are on the homepage
  });
});
