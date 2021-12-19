'use strict';

const AttributePool = require('../../../static/js/AttributePool');
const assert = require('assert').strict;
const common = require('../common');
const padManager = require('../../../node/db/PadManager');

describe(__filename, function () {
  let agent;
  let pad;
  let padId;
  let rev;
  let socket;

  before(async function () {
    agent = await common.init();
  });

  beforeEach(async function () {
    padId = common.randomString();
    assert(!await padManager.doesPadExist(padId));
    pad = await padManager.getPad(padId, '');
    assert.equal(pad.text(), '\n');
    const res = await agent.get(`/p/${padId}`).expect(200);
    socket = await common.connect(res);
    const {type, data: clientVars} = await common.handshake(socket, padId);
    assert.equal(type, 'CLIENT_VARS');
    rev = clientVars.collab_client_vars.rev;
  });

  afterEach(async function () {
    if (socket != null) socket.close();
    socket = null;
    if (pad != null) await pad.remove();
    pad = null;
  });

  describe('USER_CHANGES', function () {
    const sendUserChanges =
        async (changeset) => await common.sendUserChanges(socket, {baseRev: rev, changeset});
    const assertAccepted = async (wantRev) => {
      await common.waitForAcceptCommit(socket, wantRev);
      rev = wantRev;
    };
    const assertRejected = async () => {
      const msg = await common.waitForSocketEvent(socket, 'message');
      assert.deepEqual(msg, {disconnect: 'badChangeset'});
    };

    it('changes are applied', async function () {
      await Promise.all([
        assertAccepted(rev + 1),
        sendUserChanges('Z:1>5+5$hello'),
      ]);
      assert.equal(pad.text(), 'hello\n');
    });

    it('bad changeset is rejected', async function () {
      await Promise.all([
        assertRejected(),
        sendUserChanges('this is not a valid changeset'),
      ]);
    });

    it('retransmission is accepted, has no effect', async function () {
      const cs = 'Z:1>5+5$hello';
      await Promise.all([
        assertAccepted(rev + 1),
        sendUserChanges(cs),
      ]);
      --rev;
      await Promise.all([
        assertAccepted(rev + 1),
        sendUserChanges(cs),
      ]);
      assert.equal(pad.text(), 'hello\n');
    });

    it('identity changeset is accepted, has no effect', async function () {
      await Promise.all([
        assertAccepted(rev + 1),
        sendUserChanges('Z:1>5+5$hello'),
      ]);
      await Promise.all([
        assertAccepted(rev),
        sendUserChanges('Z:6>0$'),
      ]);
      assert.equal(pad.text(), 'hello\n');
    });

    it('non-identity changeset with no net change is accepted, has no effect', async function () {
      await Promise.all([
        assertAccepted(rev + 1),
        sendUserChanges('Z:1>5+5$hello'),
      ]);
      await Promise.all([
        assertAccepted(rev),
        sendUserChanges('Z:6>0-5+5$hello'),
      ]);
      assert.equal(pad.text(), 'hello\n');
    });
  });
});
