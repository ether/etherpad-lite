describe("Pad modal", () => {
	context('when modal is a "force reconnect" message', () => {
		const MODAL_SELECTOR = "#connectivity";

		beforeEach(async () => {
			await helper.aNewPad();

			// force a "slowcommit" error
			helper.padChrome$.window.pad.handleChannelStateChange(
				"DISCONNECTED",
				"slowcommit",
			);

			// wait for modal to be displayed
			const $modal = helper.padChrome$(MODAL_SELECTOR);
			await helper.waitForPromise(() => $modal.hasClass("popup-show"), 50000);
		});

		it("disables editor", async () => {
			expect(isEditorDisabled()).to.be(true);
		});

		context("and user clicks on editor", () => {
			it("does not close the modal", async () => {
				clickOnPadInner();
				const $modal = helper.padChrome$(MODAL_SELECTOR);
				const modalIsVisible = $modal.hasClass("popup-show");

				expect(modalIsVisible).to.be(true);
			});
		});

		context("and user clicks on pad outer", () => {
			it("does not close the modal", async () => {
				clickOnPadOuter();
				const $modal = helper.padChrome$(MODAL_SELECTOR);
				const modalIsVisible = $modal.hasClass("popup-show");

				expect(modalIsVisible).to.be(true);
			});
		});
	});

	// we use "settings" here, but other modals have the same behaviour
	context("when modal is not an error message", () => {
		const MODAL_SELECTOR = "#settings";

		beforeEach(async () => {
			await helper.aNewPad();
			await openSettingsAndWaitForModalToBeVisible();
		});

		// This test breaks safari testing
		xit("does not disable editor", async () => {
			expect(isEditorDisabled()).to.be(false);
		});

		context("and user clicks on editor", () => {
			it("closes the modal", async () => {
				clickOnPadInner();
				await helper.waitForPromise(
					() => isModalOpened(MODAL_SELECTOR) === false,
				);
			});
		});

		context("and user clicks on pad outer", () => {
			it("closes the modal", async () => {
				clickOnPadOuter();
				await helper.waitForPromise(
					() => isModalOpened(MODAL_SELECTOR) === false,
				);
			});
		});
	});

	const clickOnPadInner = () => {
		const $editor = helper.padInner$("#innerdocbody");
		$editor.trigger("click");
	};

	const clickOnPadOuter = () => {
		const $lineNumbersColumn = helper.padOuter$("#sidedivinner");
		$lineNumbersColumn.trigger("click");
	};

	const openSettingsAndWaitForModalToBeVisible = async () => {
		helper.padChrome$(".buttonicon-settings").trigger("click");

		// wait for modal to be displayed
		const modalSelector = "#settings";
		await helper.waitForPromise(() => isModalOpened(modalSelector), 10000);
	};

	const isEditorDisabled = () => {
		const editorDocument = helper
			.padOuter$("iframe[name='ace_inner']")
			.get(0).contentDocument;
		const editorBody = editorDocument.getElementById("innerdocbody");

		const editorIsDisabled =
			editorBody.contentEditable === "false" || // IE/Safari
			editorDocument.designMode === "off"; // other browsers

		return editorIsDisabled;
	};

	const isModalOpened = (modalSelector) => {
		const $modal = helper.padChrome$(modalSelector);

		return $modal.hasClass("popup-show");
	};
});
