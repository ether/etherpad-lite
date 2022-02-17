'use strict';

const assert = require('assert').strict;
const common = require('../../common');
const padManager = require('../../../../node/db/PadManager');

describe(__filename, function () {
  let agent;
  let padId;
  let pad;

  const restoreRevision = async (padId, rev) => {
    const p = new URLSearchParams(Object.entries({
      apikey: common.apiKey,
      padID: padId,
      rev,
    }));
    const res = await agent.get(`/api/1.2.11/restoreRevision?${p}`)
        .expect(200)
        .expect('Content-Type', /json/);
    assert.equal(res.body.code, 0);
  };

  before(async function () {
    agent = await common.init();
  });

  beforeEach(async function () {
    padId = common.randomString();
    if (await padManager.doesPadExist(padId)) await padManager.removePad(padId);
    pad = await padManager.getPad(padId);
    await pad.appendText('\nfoo');
    await pad.appendText('\nbar');
    assert.equal(pad.head, 2);
  });

  afterEach(async function () {
    if (await padManager.doesPadExist(padId)) await padManager.removePad(padId);
  });

  // TODO: Enable once the end-of-pad newline bugs are fixed. See:
  // https://github.com/ether/etherpad-lite/pull/5253
  xit('content matches', async function () {
    const oldHead = pad.head;
    const wantAText = await pad.getInternalRevisionAText(pad.head - 1);
    assert(wantAText.text.endsWith('\nfoo\n'));
    await restoreRevision(padId, pad.head - 1);
    assert.equal(pad.head, oldHead + 1);
    assert.deepEqual(await pad.getInternalRevisionAText(pad.head), wantAText);
  });
});
