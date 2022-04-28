import { Vector } from "./vector";
import { EntityID } from "../entity";

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
	exit_point?: Vector;
	time?: number;
}

// TODO: fix t_hit_near is not always between 0 and 1
function RayVsRect(ray_origin: Vector, ray_target: Vector, target: AABB): CollisionEvent {
	const ray_dir = ray_target.minus(ray_origin);

	const t_near = new Vector(0, 0);
	t_near.x = (target.pos.x - ray_origin.x) / ray_dir.x;
	t_near.y = (target.pos.y - ray_origin.y) / ray_dir.y;

	const t_far = new Vector(0, 0);
	t_far.x = (target.pos.x + target.size.x - ray_origin.x) / ray_dir.x;
	t_far.y = (target.pos.y + target.size.y - ray_origin.y) / ray_dir.y;

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

	if (t_near.x > t_far.y || t_near.y > t_far.x) {
		return { collision: false };
	}

	const t_hit_near = Math.max(t_near.x, t_near.y);

	const t_hit_far = Math.min(t_far.x, t_far.y);

	if (t_hit_far < 0) {
		return { collision: false };
	}

	const contact_point = new Vector();
	contact_point.x = ray_origin.x + t_hit_near * ray_dir.x;
	contact_point.y = ray_origin.y + t_hit_near * ray_dir.y;

	const exit_point = new Vector();
	exit_point.x = ray_origin.x + t_hit_far * ray_dir.x;
	exit_point.y = ray_origin.y + t_hit_far * ray_dir.y;

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

	return { collision: true, contact_point, contact_normal, time: t_hit_near, exit_point };
}

function DynamicRectVsRect(input: AABB, target: AABB, dt: number): CollisionEvent {
	if (input.vel.x === 0 && input.vel.y === 0) return { collision: false };

	const expanded_target = new AABB(
		target.id,
		new Vector(target.pos.x - input.size.x / 2, target.pos.y - input.size.y / 2),
		new Vector(target.size.x + input.size.x, target.size.y + input.size.y)
	);

	const origin = new Vector(input.pos.x + input.size.x / 2, input.pos.y + input.size.y / 2);
	const velocity = new Vector(origin.x + input.vel.x * dt, origin.y + input.vel.y * dt);

	const event = RayVsRect(origin, velocity, expanded_target);
	if (event.collision && event.time && event.time < 1) {
		return event;
	}

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

class AABB extends Rectangle {
	vel: Vector;
	id: EntityID;

	constructor(id: EntityID, pos: Vector = new Vector(), size: Vector = new Vector(), vel: Vector = new Vector()) {
		super(pos, size);
		this.id = id;
		this.vel = vel;
	}
}

export { Rectangle, AABB, PointVsRect, RectVsRect, RayVsRect, DynamicRectVsRect };
