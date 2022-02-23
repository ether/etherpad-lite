'use strict';

const assert = require('assert').strict;
const common = require('../common');
const padManager = require('../../../node/db/PadManager');
const plugins = require('../../../static/js/pluginfw/plugin_defs');
const readOnlyManager = require('../../../node/db/ReadOnlyManager');

describe(__filename, function () {
  let agent;
  let pad;
  let padId;
  let roPadId;
  let roSocket;

  before(async function () {
    agent = await common.init();
  });

  beforeEach(async function () {
    padId = common.randomString();
    assert(!await padManager.doesPadExist(padId));
    pad = await padManager.getPad(padId, 'dummy text\n');
    await pad.setText('\n'); // Make sure the pad is created.
    assert.equal(pad.text(), '\n');

    roPadId = await readOnlyManager.getReadOnlyId(padId);
    const res = await agent.get(`/p/${roPadId}`).expect(200);
    roSocket = await common.connect(res);
    await common.handshake(roSocket, roPadId, `t.${common.randomString(8)}`);
  });

  afterEach(async function () {
    if (roSocket != null) roSocket.close();
    roSocket = null;
    if (pad != null) await pad.remove();
    pad = null;
  });

  describe('CHANGESET_REQ', function () {
    it('users are unable to read changesets from other pads', async function () {
      const otherPadId = `${padId}other`;
      assert(!await padManager.doesPadExist(otherPadId));
      const otherPad = await padManager.getPad(otherPadId, 'other text\n');
      try {
        await otherPad.setText('other text\n');
        const resP = common.waitForSocketEvent(roSocket, 'message');
        await common.sendMessage(roSocket, {
          component: 'pad',
          padId: otherPadId, // The server should ignore this.
          type: 'CHANGESET_REQ',
          data: {
            granularity: 1,
            start: 0,
            requestID: 'requestId',
          },
        });
        const res = await resP;
        assert.equal(res.type, 'CHANGESET_REQ');
        assert.equal(res.data.requestID, 'requestId');
        // Should match padId's text, not otherPadId's text.
        assert.match(res.data.forwardsChangesets[0], /^[^$]*\$dummy text\n/);
      } finally {
        await otherPad.remove();
      }
    });
  });
});
