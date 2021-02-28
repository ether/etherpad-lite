'use strict';

const common = require('../common');
const assert = require('../assert-legacy').strict;

let agent;

describe(__filename, function () {
  before(async function () {
    agent = await common.init();
  });

  it('supports pads with spaces, regression test for #4883', async function () {
    await agent.get('/p/pads with spaces')
        .expect(302)
        .expect((res) => assert.equal(res.header.location, 'pads_with_spaces'));
  });
});
