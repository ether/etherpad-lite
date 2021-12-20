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
  let rev;
  let socket;
  let roSocket;
  const backups = {};

  before(async function () {
    agent = await common.init();
  });

  beforeEach(async function () {
    backups.hooks = {handleMessageSecurity: plugins.hooks.handleMessageSecurity};
    plugins.hooks.handleMessageSecurity = [];
    padId = common.randomString();
    assert(!await padManager.doesPadExist(padId));
    pad = await padManager.getPad(padId, 'dummy text');
    await pad.setText('\n'); // Make sure the pad is created.
    assert.equal(pad.text(), '\n');
    let res = await agent.get(`/p/${padId}`).expect(200);
    socket = await common.connect(res);
    const {type, data: clientVars} = await common.handshake(socket, padId);
    assert.equal(type, 'CLIENT_VARS');
    rev = clientVars.collab_client_vars.rev;

    roPadId = await readOnlyManager.getReadOnlyId(padId);
    res = await agent.get(`/p/${roPadId}`).expect(200);
    roSocket = await common.connect(res);
    await common.handshake(roSocket, roPadId, `t.${common.randomString(8)}`);
  });

  afterEach(async function () {
    Object.assign(plugins.hooks, backups.hooks);
    if (socket != null) socket.close();
    socket = null;
    if (roSocket != null) roSocket.close();
    roSocket = null;
    if (pad != null) await pad.remove();
    pad = null;
  });

  describe('USER_CHANGES', function () {
    const sendUserChanges =
        async (socket, cs) => await common.sendUserChanges(socket, {baseRev: rev, changeset: cs});
    const assertAccepted = async (socket, wantRev) => {
      await common.waitForAcceptCommit(socket, wantRev);
      rev = wantRev;
    };
    const assertRejected = async (socket) => {
      const msg = await common.waitForSocketEvent(socket, 'message');
      assert.deepEqual(msg, {disconnect: 'badChangeset'});
    };

    it('changes are applied', async function () {
      await Promise.all([
        assertAccepted(socket, rev + 1),
        sendUserChanges(socket, 'Z:1>5+5$hello'),
      ]);
      assert.equal(pad.text(), 'hello\n');
    });

    it('bad changeset is rejected', async function () {
      await Promise.all([
        assertRejected(socket),
        sendUserChanges(socket, 'this is not a valid changeset'),
      ]);
    });

    it('retransmission is accepted, has no effect', async function () {
      const cs = 'Z:1>5+5$hello';
      await Promise.all([
        assertAccepted(socket, rev + 1),
        sendUserChanges(socket, cs),
      ]);
      --rev;
      await Promise.all([
        assertAccepted(socket, rev + 1),
        sendUserChanges(socket, cs),
      ]);
      assert.equal(pad.text(), 'hello\n');
    });

    it('identity changeset is accepted, has no effect', async function () {
      await Promise.all([
        assertAccepted(socket, rev + 1),
        sendUserChanges(socket, 'Z:1>5+5$hello'),
      ]);
      await Promise.all([
        assertAccepted(socket, rev),
        sendUserChanges(socket, 'Z:6>0$'),
      ]);
      assert.equal(pad.text(), 'hello\n');
    });

    it('non-identity changeset with no net change is accepted, has no effect', async function () {
      await Promise.all([
        assertAccepted(socket, rev + 1),
        sendUserChanges(socket, 'Z:1>5+5$hello'),
      ]);
      await Promise.all([
        assertAccepted(socket, rev),
        sendUserChanges(socket, 'Z:6>0-5+5$hello'),
      ]);
      assert.equal(pad.text(), 'hello\n');
    });

    it('handleMessageSecurity can grant one-time write access', async function () {
      const cs = 'Z:1>5+5$hello';
      // First try to send a change and verify that it was dropped.
      await sendUserChanges(roSocket, cs);
      // sendUserChanges() waits for message ack, so if the message was accepted then head should
      // have already incremented by the time we get here.
      assert.equal(pad.head, rev); // Not incremented.

      // Now allow the change.
      plugins.hooks.handleMessageSecurity.push({hook_fn: () => 'permitOnce'});
      await Promise.all([
        assertAccepted(roSocket, rev + 1),
        sendUserChanges(roSocket, cs),
      ]);
      assert.equal(pad.text(), 'hello\n');

      // The next change should be dropped.
      plugins.hooks.handleMessageSecurity = [];
      await sendUserChanges(roSocket, 'Z:6>6=5+6$ world');
      assert.equal(pad.head, rev); // Not incremented.
      assert.equal(pad.text(), 'hello\n');
    });
  });
});
