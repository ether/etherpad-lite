describe("select formatting buttons when selection has style applied", () => {
	const STYLES = ["italic", "bold", "underline", "strikethrough"];
	const SHORTCUT_KEYS = ["I", "B", "U", "5"]; // italic, bold, underline, strikethrough
	const FIRST_LINE = 0;

	before(async () => {
		await helper.aNewPad();
	});

	const applyStyleOnLine = (style, line) => {
		const chrome$ = helper.padChrome$;
		selectLine(line);
		const $formattingButton = chrome$(`.buttonicon-${style}`);
		$formattingButton.trigger("click");
	};

	const isButtonSelected = (style) => {
		const chrome$ = helper.padChrome$;
		const $formattingButton = chrome$(`.buttonicon-${style}`);
		return $formattingButton.parent().hasClass("selected");
	};

	const selectLine = (lineNumber, offsetStart, offsetEnd) => {
		const inner$ = helper.padInner$;
		const $line = inner$("div").eq(lineNumber);
		helper.selectLines($line, $line, offsetStart, offsetEnd);
	};

	const placeCaretOnLine = (lineNumber) => {
		const inner$ = helper.padInner$;
		const $line = inner$("div").eq(lineNumber);
		$line.sendkeys("{leftarrow}");
	};

	const undo = async () => {
		const originalHTML = helper.padInner$("body").html();
		const $undoButton = helper.padChrome$(".buttonicon-undo");
		$undoButton.trigger("click");
		await helper.waitForPromise(
			() => helper.padInner$("body").html() !== originalHTML,
		);
	};

	const testIfFormattingButtonIsDeselected = (style) => {
		it(`deselects the ${style} button`, async () => {
			await helper.waitForPromise(() => !isButtonSelected(style));
		});
	};

	const testIfFormattingButtonIsSelected = (style) => {
		it(`selects the ${style} button`, async () => {
			await helper.waitForPromise(() => isButtonSelected(style));
		});
	};

	const applyStyleOnLineAndSelectIt = async (line, style) => {
		await applyStyleOnLineOnFullLineAndRemoveSelection(line, style, selectLine);
	};

	const applyStyleOnLineAndPlaceCaretOnit = async (line, style) => {
		await applyStyleOnLineOnFullLineAndRemoveSelection(
			line,
			style,
			placeCaretOnLine,
		);
	};

	const applyStyleOnLineOnFullLineAndRemoveSelection = async (
		line,
		style,
		selectTarget,
	) => {
		// see if line html has changed
		const inner$ = helper.padInner$;
		const oldLineHTML = inner$.find("div")[line];
		applyStyleOnLine(style, line);

		await helper.waitForPromise(() => {
			const lineHTML = inner$.find("div")[line];
			return lineHTML !== oldLineHTML;
		});
		// remove selection from previous line
		selectLine(line + 1);
		// select the text or place the caret on a position that
		// has the formatting text applied previously
		selectTarget(line);
	};

	const pressFormattingShortcutOnSelection = async (key) => {
		const inner$ = helper.padInner$;
		const originalHTML = helper.padInner$("body").html();

		// get the first text element out of the inner iframe
		const $firstTextElement = inner$("div").first();

		// select this text element
		$firstTextElement.sendkeys("{selectall}");

		const e = new inner$.Event(helper.evtType);
		e.ctrlKey = true; // Control key
		e.which = key.charCodeAt(0); // I, U, B, 5
		inner$("#innerdocbody").trigger(e);
		await helper.waitForPromise(
			() => helper.padInner$("body").html() !== originalHTML,
		);
	};

	STYLES.forEach((style) => {
		context(`when selection is in a text with ${style} applied`, () => {
			before(async function () {
				this.timeout(4000);
				await applyStyleOnLineAndSelectIt(FIRST_LINE, style);
			});

			after(async () => {
				await undo();
			});

			testIfFormattingButtonIsSelected(style);
		});

		context(`when caret is in a position with ${style} applied`, () => {
			before(async function () {
				this.timeout(4000);
				await applyStyleOnLineAndPlaceCaretOnit(FIRST_LINE, style);
			});

			after(async () => {
				await undo();
			});

			testIfFormattingButtonIsSelected(style);
		});
	});

	context("when user applies a style and the selection does not change", () => {
		it("selects the style button", async () => {
			const style = STYLES[0]; // italic
			applyStyleOnLine(style, FIRST_LINE);
			await helper.waitForPromise(() => isButtonSelected(style) === true);
			applyStyleOnLine(style, FIRST_LINE);
		});
	});

	SHORTCUT_KEYS.forEach((key, index) => {
		const styleOfTheShortcut = STYLES[index]; // italic, bold, ...
		context(`when user presses CMD + ${key}`, () => {
			before(async () => {
				await pressFormattingShortcutOnSelection(key);
			});

			testIfFormattingButtonIsSelected(styleOfTheShortcut);

			context(`and user presses CMD + ${key} again`, () => {
				before(async () => {
					await pressFormattingShortcutOnSelection(key);
				});

				testIfFormattingButtonIsDeselected(styleOfTheShortcut);
			});
		});
	});
});
