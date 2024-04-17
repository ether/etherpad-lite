describe("scrollTo.js", () => {
	describe("scrolls to line", () => {
		// create a new pad with URL hash set before each test run
		before(async () => {
			await helper.aNewPad({ hash: "L4" });
		});

		it("Scrolls down to Line 4", async () => {
			const chrome$ = helper.padChrome$;
			await helper.waitForPromise(() => {
				const topOffset = Number.parseInt(
					chrome$("iframe")
						.first("iframe")
						.contents()
						.find("#outerdocbody")
						.css("top"),
				);
				return topOffset >= 100;
			});
		});
	});

	describe("doesnt break on weird hash input", () => {
		// create a new pad with URL hash set before each test run
		before(async () => {
			await helper.aNewPad({ hash: "#DEEZ123123NUTS" });
		});

		it("Does NOT change scroll", async () => {
			const chrome$ = helper.padChrome$;
			await helper.waitForPromise(() => {
				const topOffset = Number.parseInt(
					chrome$("iframe")
						.first("iframe")
						.contents()
						.find("#outerdocbody")
						.css("top"),
				);
				return !topOffset; // no css top should be set.
			});
		});
	});
});
