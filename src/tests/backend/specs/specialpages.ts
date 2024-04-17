import type { MapArrayType } from "../../../node/types/MapType";

const common = require("../common");
const settings = require("../../../node/utils/Settings");

describe(__filename, function () {
	this.timeout(30000);
	let agent: any;
	const backups: MapArrayType<any> = {};
	before(async () => {
		agent = await common.init();
	});
	beforeEach(async () => {
		backups.settings = {};
		for (const setting of ["requireAuthentication", "requireAuthorization"]) {
			backups.settings[setting] = settings[setting];
		}
		settings.requireAuthentication = false;
		settings.requireAuthorization = false;
	});
	afterEach(async () => {
		Object.assign(settings, backups.settings);
	});

	describe("/javascript", () => {
		it("/javascript -> 200", async () => {
			await agent.get("/javascript").expect(200);
		});
	});
});
