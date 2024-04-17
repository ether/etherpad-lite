const SessionStore = require("../../../node/db/SessionStore");
import { strict as assert } from "assert";
const common = require("../common");
const db = require("../../../node/db/DB");
import util from "util";

type Session = {
	set: (sid: string | null, sess: any, sess2: any) => void;
	get: (sid: string | null) => any;
	destroy: (sid: string | null) => void;
	touch: (sid: string | null, sess: any, sess2: any) => void;
	shutdown: () => void;
};

describe(__filename, () => {
	let ss: Session | null;
	let sid: string | null;

	const set = async (sess: string | null) =>
		await util.promisify(ss!.set).call(ss, sid, sess);
	const get = async () => await util.promisify(ss!.get).call(ss, sid);
	const destroy = async () => await util.promisify(ss!.destroy).call(ss, sid);
	const touch = async (sess: Session) =>
		await util.promisify(ss!.touch).call(ss, sid, sess);

	before(async () => {
		await common.init();
	});

	beforeEach(async () => {
		ss = new SessionStore();
		sid = common.randomString();
	});

	afterEach(async () => {
		if (ss != null) {
			if (sid != null) await destroy();
			ss.shutdown();
		}
		sid = null;
		ss = null;
	});

	describe("set", () => {
		it("set of null is a no-op", async () => {
			await set(null);
			assert((await db.get(`sessionstorage:${sid}`)) == null);
		});

		it("set of non-expiring session", async () => {
			const sess: any = { foo: "bar", baz: { asdf: "jkl;" } };
			await set(sess);
			assert.equal(
				JSON.stringify(await db.get(`sessionstorage:${sid}`)),
				JSON.stringify(sess),
			);
		});

		it("set of session that expires", async () => {
			const sess: any = {
				foo: "bar",
				cookie: { expires: new Date(Date.now() + 100) },
			};
			await set(sess);
			assert.equal(
				JSON.stringify(await db.get(`sessionstorage:${sid}`)),
				JSON.stringify(sess),
			);
			await new Promise((resolve) => setTimeout(resolve, 110));
			// Writing should start a timeout.
			assert((await db.get(`sessionstorage:${sid}`)) == null);
		});

		it("set of already expired session", async () => {
			const sess: any = { foo: "bar", cookie: { expires: new Date(1) } };
			await set(sess);
			// No record should have been created.
			assert((await db.get(`sessionstorage:${sid}`)) == null);
		});

		it("switch from non-expiring to expiring", async () => {
			const sess: any = { foo: "bar" };
			await set(sess);
			const sess2: any = {
				foo: "bar",
				cookie: { expires: new Date(Date.now() + 100) },
			};
			await set(sess2);
			await new Promise((resolve) => setTimeout(resolve, 110));
			assert((await db.get(`sessionstorage:${sid}`)) == null);
		});

		it("switch from expiring to non-expiring", async () => {
			const sess: any = {
				foo: "bar",
				cookie: { expires: new Date(Date.now() + 100) },
			};
			await set(sess);
			const sess2: any = { foo: "bar" };
			await set(sess2);
			await new Promise((resolve) => setTimeout(resolve, 110));
			assert.equal(
				JSON.stringify(await db.get(`sessionstorage:${sid}`)),
				JSON.stringify(sess2),
			);
		});
	});

	describe("get", () => {
		it("get of non-existent entry", async () => {
			assert((await get()) == null);
		});

		it("set+get round trip", async () => {
			const sess: any = { foo: "bar", baz: { asdf: "jkl;" } };
			await set(sess);
			assert.equal(JSON.stringify(await get()), JSON.stringify(sess));
		});

		it("get of record from previous run (no expiration)", async () => {
			const sess = { foo: "bar", baz: { asdf: "jkl;" } };
			await db.set(`sessionstorage:${sid}`, sess);
			assert.equal(JSON.stringify(await get()), JSON.stringify(sess));
		});

		it("get of record from previous run (not yet expired)", async () => {
			const sess = {
				foo: "bar",
				cookie: { expires: new Date(Date.now() + 100) },
			};
			await db.set(`sessionstorage:${sid}`, sess);
			assert.equal(JSON.stringify(await get()), JSON.stringify(sess));
			await new Promise((resolve) => setTimeout(resolve, 110));
			// Reading should start a timeout.
			assert((await db.get(`sessionstorage:${sid}`)) == null);
		});

		it("get of record from previous run (already expired)", async () => {
			const sess = { foo: "bar", cookie: { expires: new Date(1) } };
			await db.set(`sessionstorage:${sid}`, sess);
			assert((await get()) == null);
			assert((await db.get(`sessionstorage:${sid}`)) == null);
		});

		it("external expiration update is picked up", async () => {
			const sess: any = {
				foo: "bar",
				cookie: { expires: new Date(Date.now() + 100) },
			};
			await set(sess);
			assert.equal(JSON.stringify(await get()), JSON.stringify(sess));
			const sess2 = {
				...sess,
				cookie: { expires: new Date(Date.now() + 200) },
			};
			await db.set(`sessionstorage:${sid}`, sess2);
			assert.equal(JSON.stringify(await get()), JSON.stringify(sess2));
			await new Promise((resolve) => setTimeout(resolve, 110));
			// The original timeout should not have fired.
			assert.equal(JSON.stringify(await get()), JSON.stringify(sess2));
		});
	});

	describe("shutdown", () => {
		it("shutdown cancels timeouts", async () => {
			const sess: any = {
				foo: "bar",
				cookie: { expires: new Date(Date.now() + 100) },
			};
			await set(sess);
			assert.equal(JSON.stringify(await get()), JSON.stringify(sess));
			ss!.shutdown();
			await new Promise((resolve) => setTimeout(resolve, 110));
			// The record should not have been automatically purged.
			assert.equal(
				JSON.stringify(await db.get(`sessionstorage:${sid}`)),
				JSON.stringify(sess),
			);
		});
	});

	describe("destroy", () => {
		it("destroy deletes the database record", async () => {
			const sess: any = { cookie: { expires: new Date(Date.now() + 100) } };
			await set(sess);
			await destroy();
			assert((await db.get(`sessionstorage:${sid}`)) == null);
		});

		it("destroy cancels the timeout", async () => {
			const sess: any = { cookie: { expires: new Date(Date.now() + 100) } };
			await set(sess);
			await destroy();
			await db.set(`sessionstorage:${sid}`, sess);
			await new Promise((resolve) => setTimeout(resolve, 110));
			assert.equal(
				JSON.stringify(await db.get(`sessionstorage:${sid}`)),
				JSON.stringify(sess),
			);
		});

		it("destroy session that does not exist", async () => {
			await destroy();
		});
	});

	describe("touch without refresh", () => {
		it("touch before set is equivalent to set if session expires", async () => {
			const sess: any = { cookie: { expires: new Date(Date.now() + 1000) } };
			await touch(sess);
			assert.equal(JSON.stringify(await get()), JSON.stringify(sess));
		});

		it("touch updates observed expiration but not database", async () => {
			const start = Date.now();
			const sess: any = { cookie: { expires: new Date(start + 200) } };
			await set(sess);
			const sess2: any = { cookie: { expires: new Date(start + 12000) } };
			await touch(sess2);
			assert.equal(
				JSON.stringify(await db.get(`sessionstorage:${sid}`)),
				JSON.stringify(sess),
			);
			assert.equal(JSON.stringify(await get()), JSON.stringify(sess2));
		});
	});

	describe("touch with refresh", () => {
		beforeEach(async () => {
			ss = new SessionStore(200);
		});

		it("touch before set is equivalent to set if session expires", async () => {
			const sess: any = { cookie: { expires: new Date(Date.now() + 1000) } };
			await touch(sess);
			assert.equal(JSON.stringify(await get()), JSON.stringify(sess));
		});

		it("touch before eligible for refresh updates expiration but not DB", async () => {
			const now = Date.now();
			const sess: any = {
				foo: "bar",
				cookie: { expires: new Date(now + 1000) },
			};
			await set(sess);
			const sess2: any = {
				foo: "bar",
				cookie: { expires: new Date(now + 1001) },
			};
			await touch(sess2);
			assert.equal(
				JSON.stringify(await db.get(`sessionstorage:${sid}`)),
				JSON.stringify(sess),
			);
			assert.equal(JSON.stringify(await get()), JSON.stringify(sess2));
		});

		it("touch before eligible for refresh updates timeout", async () => {
			const start = Date.now();
			const sess: any = {
				foo: "bar",
				cookie: { expires: new Date(start + 200) },
			};
			await set(sess);
			await new Promise((resolve) => setTimeout(resolve, 100));
			const sess2: any = {
				foo: "bar",
				cookie: { expires: new Date(start + 399) },
			};
			await touch(sess2);
			await new Promise((resolve) => setTimeout(resolve, 110));
			assert.equal(
				JSON.stringify(await db.get(`sessionstorage:${sid}`)),
				JSON.stringify(sess),
			);
			assert.equal(JSON.stringify(await get()), JSON.stringify(sess2));
		});

		it("touch after eligible for refresh updates db", async () => {
			const start = Date.now();
			const sess: any = {
				foo: "bar",
				cookie: { expires: new Date(start + 200) },
			};
			await set(sess);
			await new Promise((resolve) => setTimeout(resolve, 100));
			const sess2: any = {
				foo: "bar",
				cookie: { expires: new Date(start + 400) },
			};
			await touch(sess2);
			await new Promise((resolve) => setTimeout(resolve, 110));
			assert.equal(
				JSON.stringify(await db.get(`sessionstorage:${sid}`)),
				JSON.stringify(sess2),
			);
			assert.equal(JSON.stringify(await get()), JSON.stringify(sess2));
		});

		it("refresh=0 updates db every time", async () => {
			ss = new SessionStore(0);
			const sess: any = {
				foo: "bar",
				cookie: { expires: new Date(Date.now() + 1000) },
			};
			await set(sess);
			await db.remove(`sessionstorage:${sid}`);
			await touch(sess); // No change in expiration time.
			assert.equal(
				JSON.stringify(await db.get(`sessionstorage:${sid}`)),
				JSON.stringify(sess),
			);
			await db.remove(`sessionstorage:${sid}`);
			await touch(sess); // No change in expiration time.
			assert.equal(
				JSON.stringify(await db.get(`sessionstorage:${sid}`)),
				JSON.stringify(sess),
			);
		});
	});
});
