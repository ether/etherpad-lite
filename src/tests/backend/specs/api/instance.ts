/*
 * Tests for the instance-level APIs
 *
 * Section "GLOBAL FUNCTIONS" in src/node/db/API.js
 */
const common = require("../../common");

let agent: any;
const apiVersion = "1.2.14";

const endPoint = (point: string, version?: number) =>
	`/api/${version || apiVersion}/${point}`;

describe(__filename, () => {
	before(async () => {
		agent = await common.init();
	});

	describe("Connectivity for instance-level API tests", () => {
		it("can connect", async () => {
			await agent.get("/api/").expect("Content-Type", /json/).expect(200);
		});
	});

	describe("getStats", () => {
		it("Gets the stats of a running instance", async () => {
			await agent
				.get(endPoint("getStats"))
				.set("Authorization", await common.generateJWTToken())
				.expect((res: any) => {
					if (res.body.code !== 0) throw new Error("getStats() failed");

					if (
						!(
							"totalPads" in res.body.data &&
							typeof res.body.data.totalPads === "number"
						)
					) {
						throw new Error(
							"Response to getStats() does not contain field totalPads, or " +
								`it's not a number: ${JSON.stringify(res.body.data)}`,
						);
					}

					if (
						!(
							"totalSessions" in res.body.data &&
							typeof res.body.data.totalSessions === "number"
						)
					) {
						throw new Error(
							"Response to getStats() does not contain field totalSessions, or " +
								`it's not a number: ${JSON.stringify(res.body.data)}`,
						);
					}

					if (
						!(
							"totalActivePads" in res.body.data &&
							typeof res.body.data.totalActivePads === "number"
						)
					) {
						throw new Error(
							"Response to getStats() does not contain field totalActivePads, or " +
								`it's not a number: ${JSON.stringify(res.body.data)}`,
						);
					}
				})
				.expect("Content-Type", /json/)
				.expect(200);
		});
	});
});
