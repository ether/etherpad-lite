import type { MapArrayType } from "../../../node/types/MapType";

import { strict as assert } from "assert";
const { padutils } = require("../../../static/js/pad_utils");

describe(__filename, () => {
	describe("warnDeprecated", () => {
		const { warnDeprecated } = padutils;
		const backups: MapArrayType<any> = {};

		before(async () => {
			backups.logger = warnDeprecated.logger;
		});

		afterEach(async () => {
			warnDeprecated.logger = backups.logger;
			delete warnDeprecated._rl; // Reset internal rate limiter state.
		});

		/*it('includes the stack', async function () {
      let got;
      warnDeprecated.logger = {warn: (stack: any) => got = stack};
      warnDeprecated();
      assert(got!.includes(__filename));
    });*/

		it("rate limited", async () => {
			let got = 0;
			warnDeprecated.logger = { warn: () => ++got };
			warnDeprecated(); // Initialize internal rate limiter state.
			const { period } = warnDeprecated._rl;
			got = 0;
			const testCases = [
				[0, 1],
				[0, 1],
				[period - 1, 1],
				[period, 2],
			];
			for (const [now, want] of testCases) {
				// In a loop so that the stack trace is the same.
				warnDeprecated._rl.now = () => now;
				warnDeprecated();
				assert.equal(got, want);
			}
			warnDeprecated(); // Should have a different stack trace.
			assert.equal(got, testCases[testCases.length - 1][1] + 1);
		});
	});
});
