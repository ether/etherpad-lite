'use strict';

const assert = require('assert').strict;
const common = require('../common');
const padManager = require('../../../node/db/PadManager');
const settings = require('../../../node/utils/Settings');

describe(__filename, function () {
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
  let backup;

  before(async function () {
    backup = settings.lowerCasePadIds;
    agent = await common.init();
  });
  beforeEach(async function () {
    await cleanUpPads();
  });
  afterEach(async function () {
    await cleanUpPads();
  });
  after(async function () {
    settings.lowerCasePadIds = backup;
  });

  describe('not activated', function () {
    beforeEach(async function () {
      settings.lowerCasePadIds = false;
    });


    it('- do nothing', async function () {
      await agent.get('/p/UPPERCASEpad')
          .expect(200);
    });
  });

  describe('activated', function () {
    beforeEach(async function () {
      settings.lowerCasePadIds = true;
    });
    it('- lowercase pad ids', async function () {
      await agent.get('/p/UPPERCASEpad')
          .expect(302)
          .expect('location', 'uppercasepad');
    });

    it('- keeps old pads accessible', async function () {
      Object.assign(settings, {
        lowerCasePadIds: false,
      });
      const pad = await padManager.getPad('ALREADYexistingPad', 'alreadyexistingpad');
      await padManager.getPad('ALREADYexistingPad', 'bla');
      assert.equal(pad.text(), 'alreadyexistingpad\n');
      Object.assign(settings, {
        lowerCasePadIds: true,
      });

      const newpad = await padManager.getPad('alreadyexistingpad', 'testcontent');
      assert.equal(newpad.text(), 'testcontent\n');
    });
  });
});
