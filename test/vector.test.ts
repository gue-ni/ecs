import { expect } from "chai";

import { Vector } from "../src/util/vector";

describe("Vector", () => {
	it("basic", () => {
		let x = 5, y = 1;
		let v = new Vector(x, y);

		expect(v.x).to.equal(x);
		expect(v.y).to.equal(y);
	});

	it("normalize", () => {
		let v = new Vector(5, 5);
		v.normalize();
		expect(v.magnitude()).to.equal(1.0);
	});
});
