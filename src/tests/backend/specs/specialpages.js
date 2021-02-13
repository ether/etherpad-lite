const common = require('../common');
const settings = require('../../../node/utils/Settings');

describe(__filename, function () {
  this.timeout(30000);
  let agent;
  const backups = {};
  before(async function () { agent = await common.init(); });
  beforeEach(async function () {
    backups.settings = {};
    for (const setting of ['requireAuthentication', 'requireAuthorization']) {
      backups.settings[setting] = settings[setting];
    }
    settings.requireAuthentication = false;
    settings.requireAuthorization = false;
  });
  afterEach(async function () {
    Object.assign(settings, backups.settings);
  });

  describe('/javascript', function () {
    it('/javascript -> 200', async function () {
      this.timeout(200);
      await agent.get('/javascript').expect(200);
    });
  });
});
