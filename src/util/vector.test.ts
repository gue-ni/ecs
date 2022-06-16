import { assert, expect } from "chai";

import { Vector } from "./vector";

describe("Vector", () => {
	it("basic", () => {
		const x = 5,
			y = 1;
		const v = new Vector(x, y);

		assert.equal(v.x, x);
		assert.equal(v.y, y);
	});

	/*
	it("normalize", () => {
		let v = new Vector(5, 5);
		v.normalize();
		expect(v.magnitude()).to.equal(1.0);
	});
	*/
});
