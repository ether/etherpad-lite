/*
 * ACHTUNG: this file was copied & modified from the analogous
 * <basedir>/tests/backend/specs/api/pad.js
 *
 * TODO: unify those two files, and merge in a single one.
 */

const settings = require("../../loadSettings").loadSettings();
const supertest = require("supertest");

const api = supertest(`http://${settings.ip}:${settings.port}`);
const apiVersion = 1;

describe("Connectivity", () => {
	it("can connect", (done) => {
		api.get("/api/").expect("Content-Type", /json/).expect(200, done);
	});
});

describe("API Versioning", () => {
	it("finds the version tag", (done) => {
		api
			.get("/api/")
			.expect((res) => {
				if (!res.body.currentVersion) throw new Error("No version set in API");

			})
			.expect(200, done);
	});
});

describe("Permission", () => {
	it("errors with invalid OAuth token", (done) => {
		api.get(`/api/${apiVersion}/createPad?padID=test`).expect(401, done);
	});
});
