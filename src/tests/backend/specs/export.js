import * as common from "../common.js";
import * as padManager from "../../../node/db/PadManager.js";
import * as settings from "../../../node/utils/Settings.js";
'use strict';
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
