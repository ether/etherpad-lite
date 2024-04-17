import { strict as assert } from "assert";
import path from "path";
const sanitizePathname = require("../../../node/utils/sanitizePathname");

describe(__filename, () => {
	describe("absolute paths rejected", () => {
		const testCases = [
			["posix", "/"],
			["posix", "/foo"],
			["win32", "/"],
			["win32", "\\"],
			["win32", "C:/foo"],
			["win32", "C:\\foo"],
			["win32", "c:/foo"],
			["win32", "c:\\foo"],
			["win32", "/foo"],
			["win32", "\\foo"],
		];
		for (const [platform, p] of testCases) {
			it(`${platform} ${p}`, async () => {
				// @ts-ignore
				assert.throws(() => sanitizePathname(p, path[platform]), {
					message: /absolute path/,
				});
			});
		}
	});
	describe("directory traversal rejected", () => {
		const testCases = [
			["posix", ".."],
			["posix", "../"],
			["posix", "../foo"],
			["posix", "foo/../.."],
			["win32", ".."],
			["win32", "../"],
			["win32", "..\\"],
			["win32", "../foo"],
			["win32", "..\\foo"],
			["win32", "foo/../.."],
			["win32", "foo\\..\\.."],
		];
		for (const [platform, p] of testCases) {
			it(`${platform} ${p}`, async () => {
				// @ts-ignore
				assert.throws(() => sanitizePathname(p, path[platform]), {
					message: /travers/,
				});
			});
		}
	});

	describe("accepted paths", () => {
		const testCases = [
			["posix", "", "."],
			["posix", "."],
			["posix", "./"],
			["posix", "foo"],
			["posix", "foo/"],
			["posix", "foo/bar/..", "foo"],
			["posix", "foo/bar/../", "foo/"],
			["posix", "./foo", "foo"],
			["posix", "foo/bar"],
			["posix", "foo\\bar"],
			["posix", "\\foo"],
			["posix", "..\\foo"],
			["posix", "foo/../bar", "bar"],
			["posix", "C:/foo"],
			["posix", "C:\\foo"],
			["win32", "", "."],
			["win32", "."],
			["win32", "./"],
			["win32", ".\\", "./"],
			["win32", "foo"],
			["win32", "foo/"],
			["win32", "foo\\", "foo/"],
			["win32", "foo/bar/..", "foo"],
			["win32", "foo\\bar\\..", "foo"],
			["win32", "foo/bar/../", "foo/"],
			["win32", "foo\\bar\\..\\", "foo/"],
			["win32", "./foo", "foo"],
			["win32", ".\\foo", "foo"],
			["win32", "foo/bar"],
			["win32", "foo\\bar", "foo/bar"],
			["win32", "foo/../bar", "bar"],
			["win32", "foo\\..\\bar", "bar"],
			["win32", "foo/..\\bar", "bar"],
			["win32", "foo\\../bar", "bar"],
		];
		for (const [platform, p, tcWant] of testCases) {
			const want = tcWant == null ? p : tcWant;
			it(`${platform} ${p || "<empty string>"} -> ${want}`, async () => {
				// @ts-ignore
				assert.equal(sanitizePathname(p, path[platform]), want);
			});
		}
	});

	it("default path API", async () => {
		assert.equal(sanitizePathname("foo"), "foo");
	});
});
