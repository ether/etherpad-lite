const assert = require('assert').strict;
import {connect, handshake, init} from '../../backend//common';
const padManager = require('../../../node/db/PadManager');
const settings = require('../../../node/utils/Settings');
import {describe, beforeAll, beforeEach, afterEach, afterAll, it} from 'vitest'

describe(__filename, function () {
  let agent:any;
  const cleanUpPads = async () => {
    const {padIDs} = await padManager.listAllPads();
    await Promise.all(padIDs.map(async (padId: string) => {
      if (await padManager.doesPadExist(padId)) {
        const pad = await padManager.getPad(padId);
        await pad.remove();
      }
    }));
  };
  let backup:any;

  beforeAll(async function () {
    backup = settings.lowerCasePadIds;
    agent = await init();
  });
  beforeEach(async function () {
    await cleanUpPads();
  });
  afterEach(async function () {
    await cleanUpPads();
  });
  afterAll(async function () {
    settings.lowerCasePadIds = backup;
  });

  describe('not activated', function () {
    beforeEach(async function () {
      settings.lowerCasePadIds = false;
    });


    it('do nothing', async function () {
      await agent.get('/p/UPPERCASEpad')
          .expect(200);
    });
  });

  describe('activated', function () {
    beforeEach(async function () {
      settings.lowerCasePadIds = true;
    });
    it('lowercase pad ids', async function () {
      await agent.get('/p/UPPERCASEpad')
          .expect(302)
          .expect('location', 'uppercasepad');
    });

    it('keeps old pads accessible', async function () {
      Object.assign(settings, {
        lowerCasePadIds: false,
      });
      await padManager.getPad('ALREADYexistingPad', 'oldpad');
      await padManager.getPad('alreadyexistingpad', 'newpad');
      Object.assign(settings, {
        lowerCasePadIds: true,
      });

      const oldPad = await agent.get('/p/ALREADYexistingPad').expect(200);
      const oldPadSocket = await connect(oldPad);
      const oldPadHandshake = await handshake(oldPadSocket, 'ALREADYexistingPad');
      assert.equal(oldPadHandshake!.data.padId, 'ALREADYexistingPad');
      assert.equal(oldPadHandshake!.data.collab_client_vars.initialAttributedText.text, 'oldpad\n');

      const newPad = await agent.get('/p/alreadyexistingpad').expect(200);
      const newPadSocket = await connect(newPad);
      const newPadHandshake = await handshake(newPadSocket, 'alreadyexistingpad');
      assert.equal(newPadHandshake!.data.padId, 'alreadyexistingpad');
      assert.equal(newPadHandshake!.data.collab_client_vars.initialAttributedText.text, 'newpad\n');
    });

    it('disallow creation of different case pad-name via socket connection', async function () {
      await padManager.getPad('maliciousattempt', 'attempt');

      const newPad = await agent.get('/p/maliciousattempt').expect(200);
      const newPadSocket = await connect(newPad);
      const newPadHandshake = await handshake(newPadSocket, 'MaliciousAttempt');

      assert.equal(newPadHandshake.data.collab_client_vars.initialAttributedText.text, 'attempt\n');
    });
  });
});
