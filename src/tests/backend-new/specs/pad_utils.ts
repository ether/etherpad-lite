import {MapArrayType} from "../../../node/types/MapType";
const {padutils} = require('../../../static/js/pad_utils');
import {describe, it, expect, afterEach, beforeAll} from "vitest";

describe(__filename, function () {
  describe('warnDeprecated', function () {
    const {warnDeprecated} = padutils;
    const backups:MapArrayType<any> = {};

    beforeAll(async function () {
      backups.logger = warnDeprecated.logger;
    });

    afterEach(async function () {
      warnDeprecated.logger = backups.logger;
      delete warnDeprecated._rl; // Reset internal rate limiter state.
    });

    /*it('includes the stack', async function () {
      let got;
      warnDeprecated.logger = {warn: (stack: any) => got = stack};
      warnDeprecated();
      assert(got!.includes(__filename));
    });*/

    it('rate limited', async function () {
      let got = 0;
      warnDeprecated.logger = {warn: () => ++got};
      warnDeprecated(); // Initialize internal rate limiter state.
      const {period} = warnDeprecated._rl;
      got = 0;
      const testCases = [[0, 1], [0, 1], [period - 1, 1], [period, 2]];
      for (const [now, want] of testCases) { // In a loop so that the stack trace is the same.
        warnDeprecated._rl.now = () => now;
        warnDeprecated();
        expect(got).toEqual(want);
      }
      warnDeprecated(); // Should have a different stack trace.
      expect(got).toEqual(testCases[testCases.length - 1][1] + 1);
    });
  });
});
