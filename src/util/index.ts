import Vector from "./vector";

function randomInteger(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

function normalize(val: number, min: number, max: number) {
	return (val - min) / (max - min);
}

function normalizeToRange(val: number, minVal: number, maxVal: number, newMin: number, newMax: number) {
	return newMin + ((val - minVal) * (newMax - newMin)) / (maxVal - minVal);
}

/**
 * Collisions
 */

function PointVsRect(p: Vector, r: Rectangle): boolean {
	return p.x >= r.pos.x && p.y >= r.pos.y && p.x < r.pos.x + r.size.x && p.y < r.pos.y + r.size.y;
}

function RectVsRect(r1: Rectangle, r2: Rectangle): boolean {
	return (
		r1.pos.x < r2.pos.x + r2.size.x &&
		r1.pos.x + r1.size.x > r2.pos.x &&
		r1.pos.y < r2.pos.y + r2.size.y &&
		r1.pos.y + r1.size.y > r2.pos.y
	);
}

interface CollisionEvent {
	collision: boolean;
	contact_point?: Vector;
	contact_normal?: Vector;
	time?: number;
}

function RayVsRect(ray_origin: Vector, ray_dir: Vector, target: Rectangle): CollisionEvent {
	const t_near = new Vector(0, 0);
	t_near.x = (target.pos.x - ray_origin.x) / ray_dir.x;
	t_near.y = (target.pos.y - ray_origin.y) / ray_dir.y;

	const t_far = new Vector(0, 0);
	t_far.x = (target.pos.x + target.size.x - ray_origin.x) / ray_dir.x;
	t_far.y = (target.pos.y + target.size.y - ray_origin.y) / ray_dir.y;

	if (t_near.x > t_far.x) {
		let tmp = t_near.x;
		t_near.x = t_far.x;
		t_far.x = tmp;
	}

	if (t_near.y > t_far.y) {
		let tmp = t_near.y;
		t_near.y = t_far.y;
		t_far.y = tmp;
	}

	if (t_near.x > t_far.y || t_near.y > t_far.x) return { collision: false };

	let t_hit_near = Math.max(t_near.x, t_near.y);
	let t_hit_far = Math.min(t_far.x, t_far.y);

	if (t_hit_far < 0) return { collision: false };

	const contact_point = new Vector();
	contact_point.x = ray_origin.x + t_hit_near * ray_dir.x;
	contact_point.y = ray_origin.y + t_hit_near * ray_dir.y;

	const contact_normal = new Vector();

	if (t_near.x > t_near.y) {
		if (ray_dir.x < 0) {
			contact_normal.set(1, 0);
		} else {
			contact_normal.set(-1, 0);
		}
	} else if (t_near.x < t_near.y) {
		if (ray_dir.y < 0) {
			contact_normal.set(0, 1);
		} else {
			contact_normal.set(0, -1);
		}
	}

	return { collision: true, contact_point, contact_normal, time: t_hit_near };
}

function DynamicRectVsRect(input: Rectangle, target: Rectangle): CollisionEvent {
	let expanded_target = new Rectangle(
		new Vector(target.pos.x - input.size.x / 2, target.pos.y - input.size.y / 2),
		target.size.plus(input.size)
	);

	//if (RayVsRect(input.pos.))

	return { collision: false };
}

class Rectangle {
	pos: Vector;
	size: Vector;
	constructor(pos: Vector = new Vector(), size: Vector = new Vector()) {
		this.pos = pos;
		this.size = size;
	}
}

export { Vector, Rectangle, PointVsRect, RectVsRect, RayVsRect };
