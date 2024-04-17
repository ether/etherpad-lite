import type { MapArrayType } from "../../../node/types/MapType";

const common = require("../common");
const padManager = require("../../../node/db/PadManager");
const settings = require("../../../node/utils/Settings");

describe(__filename, () => {
	let agent: any;
	const settingsBackup: MapArrayType<any> = {};

	before(async () => {
		agent = await common.init();
		settingsBackup.soffice = settings.soffice;
		await padManager.getPad("testExportPad", "test content");
	});

	after(async () => {
		Object.assign(settings, settingsBackup);
	});

	it("returns 500 on export error", async () => {
		settings.soffice = "false"; // '/bin/false' doesn't work on Windows
		await agent.get("/p/testExportPad/export/doc").expect(500);
	});
});
