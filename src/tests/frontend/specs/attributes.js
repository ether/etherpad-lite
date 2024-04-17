const AttributePool = require("../../../static/js/AttributePool");
const attributes = require("../../../static/js/attributes");

describe("attributes", () => {
	const attribs = [
		["foo", "bar"],
		["baz", "bif"],
	];
	let pool;

	beforeEach(async () => {
		pool = new AttributePool();
		for (let i = 0; i < attribs.length; ++i)
			expect(pool.putAttrib(attribs[i])).to.equal(i);
	});

	describe("decodeAttribString", () => {
		it("is a generator function", async () => {
			expect(attributes.decodeAttribString).to.be.a(
				function* () {}.constructor,
			);
		});

		describe("rejects invalid attribute strings", () => {
			const testCases = ["x", "*0+1", "*A", "*0$", "*", "0", "*-1"];
			for (const tc of testCases) {
				it(JSON.stringify(tc), async () => {
					expect(() => [
						...attributes.decodeAttribString(tc),
					]).to.throwException(/invalid character/);
				});
			}
		});

		describe("accepts valid attribute strings", () => {
			const testCases = [
				["", []],
				["*0", [0]],
				["*a", [10]],
				["*z", [35]],
				["*10", [36]],
				[
					"*0*1*2*3*4*5*6*7*8*9*a*b*c*d*e*f*g*h*i*j*k*l*m*n*o*p*q*r*s*t*u*v*w*x*y*z*10",
					[...Array(37).keys()],
				],
			];
			for (const [input, want] of testCases) {
				it(`${JSON.stringify(input)} -> ${JSON.stringify(want)}`, async () => {
					const got = [...attributes.decodeAttribString(input)];
					expect(JSON.stringify(got)).to.equal(JSON.stringify(want));
				});
			}
		});
	});

	describe("encodeAttribString", () => {
		describe("accepts any kind of iterable", () => {
			const testCases = [
				[
					"generator",
					(function* () {
						yield 0;
						yield 1;
					})(),
				],
				["list", [0, 1]],
				["set", new Set([0, 1])],
			];
			for (const [desc, input] of testCases) {
				it(desc, async () => {
					expect(attributes.encodeAttribString(input)).to.equal("*0*1");
				});
			}
		});

		describe("rejects invalid inputs", () => {
			const testCases = [
				[null, /.*/], // Different browsers may have different error messages.
				[[-1], /is negative/],
				[["0"], /not a number/],
				[[null], /not a number/],
				[[0.5], /not an integer/],
				[[{}], /not a number/],
				[[true], /not a number/],
			];
			for (const [input, wantErr] of testCases) {
				it(JSON.stringify(input), async () => {
					expect(() => attributes.encodeAttribString(input)).to.throwException(
						wantErr,
					);
				});
			}
		});

		describe("accepts valid inputs", () => {
			const testCases = [
				[[], ""],
				[[0], "*0"],
				[[10], "*a"],
				[[35], "*z"],
				[[36], "*10"],
				[
					[...Array(37).keys()],
					"*0*1*2*3*4*5*6*7*8*9*a*b*c*d*e*f*g*h*i*j*k*l*m*n*o*p*q*r*s*t*u*v*w*x*y*z*10",
				],
			];
			for (const [input, want] of testCases) {
				it(`${JSON.stringify(input)} -> ${JSON.stringify(want)}`, async () => {
					expect(attributes.encodeAttribString(input)).to.equal(want);
				});
			}
		});
	});

	describe("attribsFromNums", () => {
		it("is a generator function", async () => {
			expect(attributes.attribsFromNums).to.be.a(function* () {}.constructor);
		});

		describe("accepts any kind of iterable", () => {
			const testCases = [
				[
					"generator",
					(function* () {
						yield 0;
						yield 1;
					})(),
				],
				["list", [0, 1]],
				["set", new Set([0, 1])],
			];

			for (const [desc, input] of testCases) {
				it(desc, async () => {
					const gotAttribs = [...attributes.attribsFromNums(input, pool)];
					expect(JSON.stringify(gotAttribs)).to.equal(JSON.stringify(attribs));
				});
			}
		});

		describe("rejects invalid inputs", () => {
			const testCases = [
				[null, /.*/], // Different browsers may have different error messages.
				[[-1], /is negative/],
				[["0"], /not a number/],
				[[null], /not a number/],
				[[0.5], /not an integer/],
				[[{}], /not a number/],
				[[true], /not a number/],
				[[9999], /does not exist in pool/],
			];
			for (const [input, wantErr] of testCases) {
				it(JSON.stringify(input), async () => {
					expect(() => [
						...attributes.attribsFromNums(input, pool),
					]).to.throwException(wantErr);
				});
			}
		});

		describe("accepts valid inputs", () => {
			const testCases = [
				[[], []],
				[[0], [attribs[0]]],
				[[1], [attribs[1]]],
				[
					[0, 1],
					[attribs[0], attribs[1]],
				],
				[
					[1, 0],
					[attribs[1], attribs[0]],
				],
			];
			for (const [input, want] of testCases) {
				it(`${JSON.stringify(input)} -> ${JSON.stringify(want)}`, async () => {
					const gotAttribs = [...attributes.attribsFromNums(input, pool)];
					expect(JSON.stringify(gotAttribs)).to.equal(JSON.stringify(want));
				});
			}
		});
	});

	describe("attribsToNums", () => {
		it("is a generator function", async () => {
			expect(attributes.attribsToNums).to.be.a(function* () {}.constructor);
		});

		describe("accepts any kind of iterable", () => {
			const testCases = [
				[
					"generator",
					(function* () {
						yield attribs[0];
						yield attribs[1];
					})(),
				],
				["list", [attribs[0], attribs[1]]],
				["set", new Set([attribs[0], attribs[1]])],
			];

			for (const [desc, input] of testCases) {
				it(desc, async () => {
					const gotNums = [...attributes.attribsToNums(input, pool)];
					expect(JSON.stringify(gotNums)).to.equal(JSON.stringify([0, 1]));
				});
			}
		});

		describe("rejects invalid inputs", () => {
			const testCases = [null, [null]];
			for (const input of testCases) {
				it(JSON.stringify(input), async () => {
					expect(() => [
						...attributes.attribsToNums(input, pool),
					]).to.throwException();
				});
			}
		});

		describe("reuses existing pool entries", () => {
			const testCases = [
				[[], []],
				[[attribs[0]], [0]],
				[[attribs[1]], [1]],
				[
					[attribs[0], attribs[1]],
					[0, 1],
				],
				[
					[attribs[1], attribs[0]],
					[1, 0],
				],
			];
			for (const [input, want] of testCases) {
				it(`${JSON.stringify(input)} -> ${JSON.stringify(want)}`, async () => {
					const got = [...attributes.attribsToNums(input, pool)];
					expect(JSON.stringify(got)).to.equal(JSON.stringify(want));
				});
			}
		});

		describe("inserts new attributes into the pool", () => {
			const testCases = [
				[[["k", "v"]], [attribs.length]],
				[
					[attribs[0], ["k", "v"]],
					[0, attribs.length],
				],
				[
					[["k", "v"], attribs[0]],
					[attribs.length, 0],
				],
			];
			for (const [input, want] of testCases) {
				it(`${JSON.stringify(input)} -> ${JSON.stringify(want)}`, async () => {
					const got = [...attributes.attribsToNums(input, pool)];
					expect(JSON.stringify(got)).to.equal(JSON.stringify(want));
					expect(JSON.stringify(pool.getAttrib(attribs.length))).to.equal(
						JSON.stringify(["k", "v"]),
					);
				});
			}
		});

		describe("coerces key and value to string", () => {
			const testCases = [
				["object (with toString)", { toString: () => "obj" }, "obj"],
				["undefined", undefined, ""],
				["null", null, ""],
				["boolean", true, "true"],
				["number", 1, "1"],
			];
			for (const [desc, inputVal, wantVal] of testCases) {
				describe(desc, () => {
					for (const [desc, inputAttribs, wantAttribs] of [
						[
							"key is coerced to string",
							[[inputVal, "value"]],
							[[wantVal, "value"]],
						],
						[
							"value is coerced to string",
							[["key", inputVal]],
							[["key", wantVal]],
						],
					]) {
						it(desc, async () => {
							const gotNums = [...attributes.attribsToNums(inputAttribs, pool)];
							// Each attrib in inputAttribs is expected to be new to the pool.
							const wantNums = [...Array(attribs.length + 1).keys()].slice(
								attribs.length,
							);
							expect(JSON.stringify(gotNums)).to.equal(
								JSON.stringify(wantNums),
							);
							const gotAttribs = gotNums.map((n) => pool.getAttrib(n));
							expect(JSON.stringify(gotAttribs)).to.equal(
								JSON.stringify(wantAttribs),
							);
						});
					}
				});
			}
		});
	});

	describe("attribsFromString", () => {
		it("is a generator function", async () => {
			expect(attributes.attribsFromString).to.be.a(function* () {}.constructor);
		});

		describe("rejects invalid attribute strings", () => {
			const testCases = [
				["x", /invalid character/],
				["*0+1", /invalid character/],
				["*A", /invalid character/],
				["*0$", /invalid character/],
				["*", /invalid character/],
				["0", /invalid character/],
				["*-1", /invalid character/],
				["*9999", /does not exist in pool/],
			];
			for (const [input, wantErr] of testCases) {
				it(JSON.stringify(input), async () => {
					expect(() => [
						...attributes.attribsFromString(input, pool),
					]).to.throwException(wantErr);
				});
			}
		});

		describe("accepts valid inputs", () => {
			const testCases = [
				["", []],
				["*0", [attribs[0]]],
				["*1", [attribs[1]]],
				["*0*1", [attribs[0], attribs[1]]],
				["*1*0", [attribs[1], attribs[0]]],
			];
			for (const [input, want] of testCases) {
				it(`${JSON.stringify(input)} -> ${JSON.stringify(want)}`, async () => {
					const gotAttribs = [...attributes.attribsFromString(input, pool)];
					expect(JSON.stringify(gotAttribs)).to.equal(JSON.stringify(want));
				});
			}
		});
	});

	describe("attribsToString", () => {
		describe("accepts any kind of iterable", () => {
			const testCases = [
				[
					"generator",
					(function* () {
						yield attribs[0];
						yield attribs[1];
					})(),
				],
				["list", [attribs[0], attribs[1]]],
				["set", new Set([attribs[0], attribs[1]])],
			];

			for (const [desc, input] of testCases) {
				it(desc, async () => {
					const got = attributes.attribsToString(input, pool);
					expect(got).to.equal("*0*1");
				});
			}
		});

		describe("rejects invalid inputs", () => {
			const testCases = [null, [null]];
			for (const input of testCases) {
				it(JSON.stringify(input), async () => {
					expect(() =>
						attributes.attribsToString(input, pool),
					).to.throwException();
				});
			}
		});

		describe("reuses existing pool entries", () => {
			const testCases = [
				[[], ""],
				[[attribs[0]], "*0"],
				[[attribs[1]], "*1"],
				[[attribs[0], attribs[1]], "*0*1"],
				[[attribs[1], attribs[0]], "*1*0"],
			];
			for (const [input, want] of testCases) {
				it(`${JSON.stringify(input)} -> ${JSON.stringify(want)}`, async () => {
					const got = attributes.attribsToString(input, pool);
					expect(got).to.equal(want);
				});
			}
		});

		describe("inserts new attributes into the pool", () => {
			const testCases = [
				[[["k", "v"]], `*${attribs.length}`],
				[[attribs[0], ["k", "v"]], `*0*${attribs.length}`],
				[[["k", "v"], attribs[0]], `*${attribs.length}*0`],
			];
			for (const [input, want] of testCases) {
				it(`${JSON.stringify(input)} -> ${JSON.stringify(want)}`, async () => {
					const got = attributes.attribsToString(input, pool);
					expect(got).to.equal(want);
					expect(JSON.stringify(pool.getAttrib(attribs.length))).to.equal(
						JSON.stringify(["k", "v"]),
					);
				});
			}
		});
	});
});
