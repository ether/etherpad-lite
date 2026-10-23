'use strict';

import {strict as assert} from 'assert';

const common = require('../common');
const padManager = require('../../../node/db/PadManager');
const securityManager = require('../../../node/db/SecurityManager');

// A socket.io connection that carries neither the token cookie nor a legacy
// CLIENT_READY token must not be mapped to a shared `token2author:null` author.
// Otherwise every cookie-less client is the same author and can act as the
// creator of any pad another cookie-less client created.
describe(__filename, function () {
  let padId: string;
  const sockets: any[] = [];

  before(async function () {
    this.timeout(60000);
    await common.init();
  });

  beforeEach(async function () {
    padId = `nullToken_${common.randomString()}`;
  });

  afterEach(async function () {
    while (sockets.length) sockets.pop().close();
    if (await padManager.doesPadExist(padId)) await (await padManager.getPad(padId)).remove();
  });

  const cookielessClient = async () => {
    const socket = await common.connect(null);
    sockets.push(socket);
    const cv: any = await common.handshake(socket, padId, null);
    assert.equal(cv.type, 'CLIENT_VARS');
    return {socket, cv};
  };

  it('gives each cookie-less connection its own author', async function () {
    const first = await cookielessClient();
    const second = await cookielessClient();
    assert.notEqual(first.cv.data.userId, second.cv.data.userId);
  });

  it('does not let an unrelated cookie-less connection delete the pad', async function () {
    const creator = await cookielessClient();
    creator.socket.close();
    const other = await cookielessClient();
    assert.equal(other.cv.data.canDeletePad, false);
    await common.sendPadDelete(other.socket, {padId}).catch(() => {});
    assert.ok(await padManager.doesPadExist(padId),
        'pad was deleted by an unrelated cookie-less connection');
  });

  it('checkAccess does not map a missing token to a shared author', async function () {
    const a = await securityManager.checkAccess(padId, null, null, undefined);
    const b = await securityManager.checkAccess(padId, null, undefined, undefined);
    assert.equal(a.accessStatus, 'grant');
    assert.equal(b.accessStatus, 'grant');
    assert.notEqual(a.authorID, b.authorID);
  });
});
