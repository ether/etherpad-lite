const assert = require("assert").strict;
const common = require("../common");
const padManager = require("../../../node/db/PadManager");
const settings = require("../../../node/utils/Settings");

describe(__filename, () => {
	let agent: any;
	const cleanUpPads = async () => {
		const { padIDs } = await padManager.listAllPads();
		await Promise.all(
			padIDs.map(async (padId: string) => {
				if (await padManager.doesPadExist(padId)) {
					const pad = await padManager.getPad(padId);
					await pad.remove();
				}
			}),
		);
	};
	let backup: any;

	before(async () => {
		backup = settings.lowerCasePadIds;
		agent = await common.init();
	});
	beforeEach(async () => {
		await cleanUpPads();
	});
	afterEach(async () => {
		await cleanUpPads();
	});
	after(async () => {
		settings.lowerCasePadIds = backup;
	});

	describe("not activated", () => {
		beforeEach(async () => {
			settings.lowerCasePadIds = false;
		});

		it("do nothing", async () => {
			await agent.get("/p/UPPERCASEpad").expect(200);
		});
	});

	describe("activated", () => {
		beforeEach(async () => {
			settings.lowerCasePadIds = true;
		});
		it("lowercase pad ids", async () => {
			await agent
				.get("/p/UPPERCASEpad")
				.expect(302)
				.expect("location", "uppercasepad");
		});

		it("keeps old pads accessible", async () => {
			Object.assign(settings, {
				lowerCasePadIds: false,
			});
			await padManager.getPad("ALREADYexistingPad", "oldpad");
			await padManager.getPad("alreadyexistingpad", "newpad");
			Object.assign(settings, {
				lowerCasePadIds: true,
			});

			const oldPad = await agent.get("/p/ALREADYexistingPad").expect(200);
			const oldPadSocket = await common.connect(oldPad);
			const oldPadHandshake = await common.handshake(
				oldPadSocket,
				"ALREADYexistingPad",
			);
			assert.equal(oldPadHandshake.data.padId, "ALREADYexistingPad");
			assert.equal(
				oldPadHandshake.data.collab_client_vars.initialAttributedText.text,
				"oldpad\n",
			);

			const newPad = await agent.get("/p/alreadyexistingpad").expect(200);
			const newPadSocket = await common.connect(newPad);
			const newPadHandshake = await common.handshake(
				newPadSocket,
				"alreadyexistingpad",
			);
			assert.equal(newPadHandshake.data.padId, "alreadyexistingpad");
			assert.equal(
				newPadHandshake.data.collab_client_vars.initialAttributedText.text,
				"newpad\n",
			);
		});

		it("disallow creation of different case pad-name via socket connection", async () => {
			await padManager.getPad("maliciousattempt", "attempt");

			const newPad = await agent.get("/p/maliciousattempt").expect(200);
			const newPadSocket = await common.connect(newPad);
			const newPadHandshake = await common.handshake(
				newPadSocket,
				"MaliciousAttempt",
			);

			assert.equal(
				newPadHandshake.data.collab_client_vars.initialAttributedText.text,
				"attempt\n",
			);
		});
	});
});
