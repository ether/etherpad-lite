'use strict';

const assert = require('assert').strict;
const common = require('../common');
const padManager = require('../../../node/db/PadManager');
const settings = require('../../../node/utils/Settings');

describe(__filename, function () {
  this.timeout(30000);
  let agent;
  const cleanUpPads = async () => {
    const padIds = ['UPPERCASEpad', 'uppercasepad', 'ALREADYexistingPad', 'alreadyexistingpad'];
    await Promise.all(padIds.map(async (padId) => {
      if (await padManager.doesPadExist(padId)) {
        const pad = await padManager.getPad(padId);
        await pad.remove();
      }
    }));
  };

  before(async function () { agent = await common.init(); });
  beforeEach(async function () {
    await cleanUpPads();
  });
  afterEach(async function () {
    await cleanUpPads();
  });

  describe('not activated', function () {
    Object.assign(settings, {
      enforceLowerCasePadIds: false,
    });
    it('- do nothing', async function () {
      const res = await agent.get('/p/UPPERCASEpad');
      assert.equal(res.status, 200);
    });

    it('- do nothingg', async function () {
      await agent.get('/p/UPPERCASEpad')
          .expect(200);
    });
  });

  describe('activated', function () {
    it('- lowercase pad ids', async function () {
      Object.assign(settings, {
        enforceLowerCasePadIds: true,
      });
      await agent.get('/p/UPPERCASEpad')
          .expect(302)
          .expect('location', 'uppercasepad');
    });

    it('- keeps old pads accessible', async function () {
      Object.assign(settings, {
        enforceLowerCasePadIds: false,
      });
      const pad = await padManager.getPad('ALREADYexistingPad', 'alreadyexistingpad');
      await padManager.getPad('ALREADYexistingPad', 'bla');
      assert.equal(pad.text(), 'alreadyexistingpad\n');
      Object.assign(settings, {
        enforceLowerCasePadIds: true,
      });

      const newpad = await padManager.getPad('alreadyexistingpad', 'testcontent');
      assert.equal(newpad.text(), 'testcontent\n');
    });
  });
});
