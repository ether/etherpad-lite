import type { PadType } from "../../../node/types/PadType";

const Pad = require("../../../node/db/Pad");
import { strict as assert } from "assert";
import type { MapArrayType } from "../../../node/types/MapType";
const authorManager = require("../../../node/db/AuthorManager");
const common = require("../common");
const padManager = require("../../../node/db/PadManager");
const plugins = require("../../../static/js/pluginfw/plugin_defs");
const settings = require("../../../node/utils/Settings");

describe(__filename, () => {
	const backups: MapArrayType<any> = {};
	let pad: PadType | null;
	let padId: string;

	before(async () => {
		backups.hooks = {
			padDefaultContent: plugins.hooks.padDefaultContent,
		};
		backups.defaultPadText = settings.defaultPadText;
	});

	beforeEach(async () => {
		backups.hooks.padDefaultContent = [];
		padId = common.randomString();
		assert(!(await padManager.doesPadExist(padId)));
	});

	afterEach(async () => {
		Object.assign(plugins.hooks, backups.hooks);
		if (pad != null) await pad.remove();
		pad = null;
	});

	describe("cleanText", () => {
		const testCases = [
			["", ""],
			["\n", "\n"],
			["x", "x"],
			["x\n", "x\n"],
			["x\ny\n", "x\ny\n"],
			["x\ry\n", "x\ny\n"],
			["x\r\ny\n", "x\ny\n"],
			["x\r\r\ny\n", "x\n\ny\n"],
		];
		for (const [input, want] of testCases) {
			it(`${JSON.stringify(input)} -> ${JSON.stringify(want)}`, async () => {
				assert.equal(Pad.cleanText(input), want);
			});
		}
	});

	describe("padDefaultContent hook", () => {
		it("runs when a pad is created without specific text", async () => {
			const p = new Promise<void>((resolve) => {
				plugins.hooks.padDefaultContent.push({ hook_fn: () => resolve() });
			});
			pad = await padManager.getPad(padId);
			await p;
		});

		it("not run if pad is created with specific text", async () => {
			plugins.hooks.padDefaultContent.push({
				hook_fn: () => {
					throw new Error("should not be called");
				},
			});
			pad = await padManager.getPad(padId, "");
		});

		it("defaults to settings.defaultPadText", async () => {
			const p = new Promise<void>((resolve, reject) => {
				plugins.hooks.padDefaultContent.push({
					hook_fn: async (hookName: string, ctx: any) => {
						try {
							assert.equal(ctx.type, "text");
							assert.equal(ctx.content, settings.defaultPadText);
						} catch (err) {
							return reject(err);
						}
						resolve();
					},
				});
			});
			pad = await padManager.getPad(padId);
			await p;
		});

		it("passes the pad object", async () => {
			const gotP = new Promise((resolve) => {
				plugins.hooks.padDefaultContent.push({
					hook_fn: async (
						hookName: string,
						{
							pad,
						}: {
							pad: PadType;
						},
					) => resolve(pad),
				});
			});
			pad = await padManager.getPad(padId);
			assert.equal(await gotP, pad);
		});

		it("passes empty authorId if not provided", async () => {
			const gotP = new Promise((resolve) => {
				plugins.hooks.padDefaultContent.push({
					hook_fn: async (
						hookName: string,
						{
							authorId,
						}: {
							authorId: string;
						},
					) => resolve(authorId),
				});
			});
			pad = await padManager.getPad(padId);
			assert.equal(await gotP, "");
		});

		it("passes provided authorId", async () => {
			const want = await authorManager.getAuthor4Token(`t.${padId}`);
			const gotP = new Promise((resolve) => {
				plugins.hooks.padDefaultContent.push({
					hook_fn: async (
						hookName: string,
						{
							authorId,
						}: {
							authorId: string;
						},
					) => resolve(authorId),
				});
			});
			pad = await padManager.getPad(padId, null, want);
			assert.equal(await gotP, want);
		});

		it("uses provided content", async () => {
			const want = "hello world";
			assert.notEqual(want, settings.defaultPadText);
			plugins.hooks.padDefaultContent.push({
				hook_fn: async (hookName: string, ctx: any) => {
					ctx.type = "text";
					ctx.content = want;
				},
			});
			pad = await padManager.getPad(padId);
			assert.equal(pad!.text(), `${want}\n`);
		});

		it("cleans provided content", async () => {
			const input = "foo\r\nbar\r\tbaz";
			const want = "foo\nbar\n        baz";
			assert.notEqual(want, settings.defaultPadText);
			plugins.hooks.padDefaultContent.push({
				hook_fn: async (hookName: string, ctx: any) => {
					ctx.type = "text";
					ctx.content = input;
				},
			});
			pad = await padManager.getPad(padId);
			assert.equal(pad!.text(), `${want}\n`);
		});
	});
});
