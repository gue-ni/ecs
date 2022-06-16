import { assert } from "chai";

import { Vector } from "./vector";
import { Rectangle, PointVsRect, RectVsRect, RayVsRect, DynamicRectVsRect } from "./collision";

describe("Collision", () => {
	it("PointVsRect", () => {
		const point = new Vector();
		const rect = new Rectangle(0, 0, 2, 2);

		point.set(1, 1);
		assert.isTrue(PointVsRect(point, rect));

		point.set(-1, 1);
		assert.isFalse(PointVsRect(point, rect));
	});

	it("RectVsRect", () => {
		const r1 = new Rectangle(0, 0, 2, 2);
		const r2 = new Rectangle(1, 1, 2, 2);
		const r3 = new Rectangle(4, 1, 2, 2);
		assert.isTrue(RectVsRect(r1, r2));
		assert.isFalse(RectVsRect(r1, r3));
	});

	it("RayVsRect", () => {});

	it("DynamicRectVsRect", () => {});
});
