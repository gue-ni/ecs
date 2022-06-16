import { Vector, IVector } from "./vector";
import { Entity } from "../entity";
import { clamp } from "./index";

/**
 * https://www.youtube.com/watch?v=8JJ-4JgR7Dg
 * https://noonat.github.io/intersect/
 * https://gamedev.stackexchange.com/questions/144817/swept-aabb-3d-incorrect-collision-resolution-along-negative-normals
 */


function PointVsRect(p: IVector, r: Rectangle): boolean {
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
	contact_point: Vector;
	contact_normal: Vector;
	exit_point: Vector;
	time: number;
}

const _DEBUG = false;

/**
 *
 * @param ray_origin origin of ray
 * @param ray_dir ray direction, not normalized
 * @param target AABB to collide with
 * @returns 
 */
function RayVsRect(ray_origin: Vector, ray_dir: Vector, target: AABB): CollisionEvent | null {
	const t_near = new Vector(0, 0);
	t_near.x = (target.pos.x - ray_origin.x) / ray_dir.x;
	t_near.y = (target.pos.y - ray_origin.y) / ray_dir.y;

	const t_far = new Vector(0, 0);
	t_far.x = (target.pos.x + target.size.x - ray_origin.x) / ray_dir.x;
	t_far.y = (target.pos.y + target.size.y - ray_origin.y) / ray_dir.y;

	if (isNaN(t_far.x) || isNaN(t_far.y)) {
		if (_DEBUG) console.log("case 0");
		return null;
	}

	if (isNaN(t_near.x) || isNaN(t_near.y)) {
		if (_DEBUG) console.log("case 0");
		return null;
	}

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
		if (_DEBUG) console.log("case 1");
		return null;
	}

	const t_hit_near = Math.max(t_near.x, t_near.y);

	const t_hit_far = Math.min(t_far.x, t_far.y);

	if (t_hit_near > 1 || t_hit_far < 0) {
		if (_DEBUG) console.log("case 2");
		return null;
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

	if (!isFinite(t_hit_near)) {
		if (_DEBUG) console.log("case 3");
		return null;
	}

	if (_DEBUG) console.log("case 4");
	return { contact_point, contact_normal, time: t_hit_near, exit_point };
}

function DynamicRectVsRect(input: AABB, target: AABB, dt: number): CollisionEvent | null {
	if (input.vel.x === 0 && input.vel.y === 0) return null;

	const expanded_target = new AABB(
		target.entity,
		new Vector(target.pos.x - input.size.x / 2, target.pos.y - input.size.y / 2),
		new Vector(target.size.x + input.size.x, target.size.y + input.size.y)
	);

	const origin = new Vector(input.pos.x + input.size.x / 2, input.pos.y + input.size.y / 2);
	const delta = new Vector(input.vel.x * dt, input.vel.y * dt);

	const event = RayVsRect(origin, delta, expanded_target);
	if (event && event.time !== undefined && -0.0001 < event.time && event.time <= 1) {
		//event.time = clamp(event.time - EPSILON, 0, 1);
		return event;
	}

	return null;
}

enum ColliderType {
	SOLID,
	BOUNCE,
	CUSTOM,
	CUSTOM_SOLID,
	SOLID_FROM_TOP,
	CUSTOM_SOLID_FROM_TOP,
}

/**
 * 
 */
class Rectangle {
	pos: Vector;
	size: Vector;

	/**
	 * 
	 * @param pos 
	 * @param size 
	 */
	/*
	constructor(pos: Vector = new Vector(), size: Vector = new Vector()) {
		this.pos = pos;
		this.size = size;
	}
	*/

	constructor(x:number, y:number, w:number, h:number){
		this.pos = new Vector(x,y)
		this.size = new Vector(w,h)
	}

	get top_left(): Vector{
		return this.pos.clone();
	}

	get bottom_right(): Vector{
		return new Vector(this.pos.x + this.size.x, this.pos.y + this.pos.y)
	}

	debug_draw(context: CanvasRenderingContext2D, color: string = "red", x_offset: number = 0, y_offset: number = 0) {
		context.strokeStyle = color;
		context.strokeRect(this.pos.x + x_offset - 0.5, this.pos.y + y_offset - 0.5, this.size.x, this.size.y);
	}
}

class AABB extends Rectangle {
	vel: Vector;
	entity: Entity | null;
	type: ColliderType;

	constructor(
		entity: Entity | null,
		pos: Vector = new Vector(),
		size: Vector = new Vector(),
		vel: Vector = new Vector(),
		type: ColliderType = ColliderType.SOLID
	) {
		super(pos.x, pos.y, size.x, size.y);
		this.entity = entity;
		this.vel = vel;
		this.type = type;
	}

	get minX() {
		return this.pos.x;
	}

	get maxX() {
		return this.pos.x + this.size.x;
	}

	get minY() {
		return this.pos.y;
	}

	get maxY() {
		return this.pos.y + this.size.y;
	}
}

export { Rectangle, ColliderType, AABB, CollisionEvent, PointVsRect, RectVsRect, RayVsRect, DynamicRectVsRect };
