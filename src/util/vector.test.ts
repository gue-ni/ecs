import { assert } from "chai";

import { Vector } from "./vector";

const EPSILON = 0.0000000001;

describe("Vector", () => {
	it("basic", () => {
		const x = 5,
			y = 1;
		const vector = new Vector(x, y);
		assert.equal(vector.x, x);
		assert.equal(vector.y, y);
	});

	it("magnitude", () => {
		const vector = new Vector(3, 0);
		assert.closeTo(vector.magnitude(), 3, EPSILON);
	});

	it("normalize", () => {
		const vector = new Vector(5, 5).normalize()
		assert.closeTo(vector.magnitude(), 1, EPSILON);
	});
});
