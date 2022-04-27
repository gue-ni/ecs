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

function PointVsRect(p: Vector, r: AABB): boolean {
	return p.x >= r.pos.x && p.y >= r.pos.y && p.x < r.pos.x + r.size.x && p.y < r.pos.y + r.size.y;
}

function RectVsRect(r1: AABB, r2: AABB): boolean {
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

// TODO fix this function
// beware of divide by zero in javascript vs c++

function RayVsRect(ray_origin: Vector, ray_dir: Vector, target: AABB): CollisionEvent {
	const t_near = new Vector(0, 0);
	t_near.x = (target.pos.x - ray_origin.x) / ray_dir.x;
	t_near.y = (target.pos.y - ray_origin.y) / ray_dir.y;

	const t_far = new Vector(0, 0);
	t_far.x = (target.pos.x + target.size.x - ray_origin.x) / ray_dir.x;
	t_far.y = (target.pos.y + target.size.y - ray_origin.y) / ray_dir.y;

	//if (!isFinite(t_far.x) || !isFinite(t_far.y)) return { collision: false };
	//if (!isFinite(t_near.x) || !isFinite(t_near.y)) return { collision: false };

	if (t_near.x > t_far.x) {
		const tmp = t_near.x;
		t_near.x = t_far.x;
		t_far.x = tmp;
	}

	if (t_near.y > t_far.y) {
		const tmp = t_near.y;
		t_near.y = t_far.y;
		t_far.y = tmp;
	}

	console.log("t_near", t_near.x.toFixed(1), t_near.y.toFixed(1), "t_far", t_far.x.toFixed(1), t_far.y.toFixed(1));

	if (t_near.x > t_far.y || t_near.y > t_far.x) {
		console.log("case 1");
		return { collision: false };
	}

	// first contact
	const t_hit_near = Math.max(t_near.x, t_near.y);

	const t_hit_far = Math.min(t_far.x, t_far.y);

	if (t_hit_far < 0) {
		console.log("case 2");
		return { collision: false };
	}

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

	console.log("case 3");
	return { collision: true, contact_point, contact_normal, time: t_hit_near };
}

function RayVsRect2(ray_origin: Vector, ray_dir: Vector, target: AABB): CollisionEvent {
	let tMin = new Vector();
	let tMax = new Vector();

	tMin.x = (target.pos.x - ray_origin.x) / ray_dir.x;
	tMin.y = (target.pos.y - ray_origin.y) / ray_dir.y;

	tMax.x = (target.pos.x + target.size.x - ray_origin.x) / ray_dir.x;
	tMax.y = (target.pos.y + target.size.y - ray_origin.y) / ray_dir.y;

	let t1 = Vector.min(tMin, tMax);
	let t2 = Vector.max(tMin, tMax);

	let tNear = Math.max(t1.x, t1.y);
	let tFar = Math.min(t2.x, t2.y);

	return { collision: tNear > tFar, time: tNear };
}

function DynamicRectVsRect(input: AABB, target: AABB, dt: number): boolean {
	if (input.vel.x === 0 && input.vel.y === 0) return false;

	const expanded_target = new AABB(
		new Vector(target.pos.x - input.size.x / 2, target.pos.y - input.size.y / 2),
		new Vector(target.size.x + input.size.x, target.size.y + input.size.y)
	);

	// center of input rectangle
	const origin = new Vector(input.pos.x + input.size.x / 2, input.pos.y + input.size.y / 2);

	const velocity = new Vector(origin.x + input.vel.x * dt, origin.y + input.vel.y * dt);

	const { collision, time } = RayVsRect(origin, velocity, expanded_target);
	if (collision && time) {
		return 0 <= time && time <= 1;
	}

	return false;
}

class AABB {
	pos: Vector;
	size: Vector;
	vel: Vector;

	constructor(pos: Vector = new Vector(), size: Vector = new Vector(), vel: Vector = new Vector()) {
		this.pos = pos;
		this.size = size;
		this.vel = vel;
	}
}

export { Vector, AABB, PointVsRect, RectVsRect, RayVsRect, RayVsRect2, DynamicRectVsRect };
