'use strict';

const common = require('../common');
const padManager = require('../../../node/db/PadManager');
const settings = require('../../../node/utils/Settings');

describe(__filename, function () {
  let agent;
  const settingsBackup = {};

  before(async function () {
    agent = await common.init();
    settingsBackup.soffice = settings.soffice;
    await padManager.getPad('testExportPad', 'test content');
  });

  after(async function () {
    Object.assign(settings, settingsBackup);
  });

  it('returns 500 on export error', async function () {
    settings.soffice = 'false'; // '/bin/false' doesn't work on Windows
    await agent.get('/p/testExportPad/export/doc')
        .expect(500);
  });
});
