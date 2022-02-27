'use strict';

const assert = require('assert').strict;
const {padutils} = require('../../../static/js/pad_utils');

describe(__filename, function () {
  describe('warnDeprecated', function () {
    const {warnDeprecated} = padutils;
    const backups = {};

    before(async function () {
      backups.logger = warnDeprecated.logger;
    });

    afterEach(async function () {
      warnDeprecated.logger = backups.logger;
    });

    it('includes the stack', async function () {
      let got;
      warnDeprecated.logger = {warn: (stack) => got = stack};
      warnDeprecated();
      assert(got.includes(__filename));
    });
  });
});
