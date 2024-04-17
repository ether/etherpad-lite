const assert = require("assert").strict;
const { parseSettings } =
	require("../../../node/utils/Settings").exportedForTestingOnly;
import path from "path";
import process from "process";

describe(__filename, () => {
	describe("parseSettings", () => {
		let settings: any;
		const envVarSubstTestCases = [
			{ name: "true", val: "true", var: "SET_VAR_TRUE", want: true },
			{ name: "false", val: "false", var: "SET_VAR_FALSE", want: false },
			{ name: "null", val: "null", var: "SET_VAR_NULL", want: null },
			{
				name: "undefined",
				val: "undefined",
				var: "SET_VAR_UNDEFINED",
				want: undefined,
			},
			{ name: "number", val: "123", var: "SET_VAR_NUMBER", want: 123 },
			{ name: "string", val: "foo", var: "SET_VAR_STRING", want: "foo" },
			{ name: "empty string", val: "", var: "SET_VAR_EMPTY_STRING", want: "" },
		];

		before(async () => {
			for (const tc of envVarSubstTestCases) process.env[tc.var] = tc.val;
			delete process.env.UNSET_VAR;
			settings = parseSettings(path.join(__dirname, "settings.json"), true);
			assert(settings != null);
		});

		describe("environment variable substitution", () => {
			describe("set", () => {
				for (const tc of envVarSubstTestCases) {
					it(tc.name, async () => {
						const obj = settings["environment variable substitution"].set;
						if (tc.name === "undefined") {
							assert(!(tc.name in obj));
						} else {
							assert.equal(obj[tc.name], tc.want);
						}
					});
				}
			});

			describe("unset", () => {
				it("no default", async () => {
					const obj = settings["environment variable substitution"].unset;
					assert.equal(obj["no default"], null);
				});

				for (const tc of envVarSubstTestCases) {
					it(tc.name, async () => {
						const obj = settings["environment variable substitution"].unset;
						if (tc.name === "undefined") {
							assert(!(tc.name in obj));
						} else {
							assert.equal(obj[tc.name], tc.want);
						}
					});
				}
			});
		});
	});

	describe("Parse plugin settings", () => {
		before(async () => {
			process.env["EP__ADMIN__PASSWORD"] = "test";
		});

		it("should parse plugin settings", async () => {
			const settings = parseSettings(
				path.join(__dirname, "settings.json"),
				true,
			);
			assert.equal(settings.ADMIN.PASSWORD, "test");
		});

		it("should bundle settings with same path", async () => {
			process.env["EP__ADMIN__USERNAME"] = "test";
			const settings = parseSettings(
				path.join(__dirname, "settings.json"),
				true,
			);
			assert.deepEqual(settings.ADMIN, { PASSWORD: "test", USERNAME: "test" });
		});

		it("Can set the ep themes", async () => {
			process.env["EP__ep_themes__default_theme"] = "hacker";
			const settings = parseSettings(
				path.join(__dirname, "settings.json"),
				true,
			);
			assert.deepEqual(settings.ep_themes, { default_theme: "hacker" });
		});

		it("can set the ep_webrtc settings", async () => {
			process.env["EP__ep_webrtc__enabled"] = "true";
			const settings = parseSettings(
				path.join(__dirname, "settings.json"),
				true,
			);
			assert.deepEqual(settings.ep_webrtc, { enabled: true });
		});
	});
});
