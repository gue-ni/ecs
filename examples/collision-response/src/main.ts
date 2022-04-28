import * as ECS from "../../../lib";
import { Input, InputSystem } from "./input";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

const GRAVITY = 200;
const SPEED = 100;
let dummyhashgrid: Map<string, ECS.AABB> = new Map();
const quadtree = new ECS.QuadTree(
	0,
	new ECS.Rectangle(new ECS.Vector(), new ECS.Vector(canvas.width, canvas.height))
);

/**
 * Components
 */

class Sprite extends ECS.Component {
	w: number;
	h: number;
	color: string;

	constructor(w: number, h: number, color: string = "white") {
		super();
		this.w = w;
		this.h = h;
		this.color = color;
	}
}

class Position extends ECS.Component {
	_x: number;
	_y: number;

	constructor(x: number, y: number) {
		super();
		this._x = x;
		this._y = y;
	}

	get x() {
		return Math.round(this._x);
	}

	get y() {
		return Math.round(this._y);
	}

	set x(v) {
		this._x = v;
	}

	set y(v) {
		this._y = v;
	}
}

class Velocity extends ECS.Component {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		super();
		this.x = x;
		this.y = y;
	}
}

class Collider extends ECS.Component {}

/**
 * Systems
 */

class SpriteSystem extends ECS.System {
	constructor() {
		super([Sprite, Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const rect = entity.getComponent(Sprite) as Sprite;
		const position = entity.getComponent(Position) as Position;
		params.context.strokeStyle = rect.color;
		params.context.strokeRect(position.x, position.y, rect.w, rect.h);
	}
}

class PhysicsSystem extends ECS.System {
	constructor() {
		super([Position, Velocity, Sprite]); // necessary Components
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = entity.getComponent(Position) as Position;
		const velocity = entity.getComponent(Velocity) as Velocity;
		const sprite = entity.getComponent(Sprite) as Sprite;

		//const rect = entity.getComponent(RectSprite) as RectSprite;
		//console.log("velocity", velocity.name, "position", position.name, "rect", rect.name);

		position.x = position.x + params.dt * velocity.x;
		position.y = position.y + params.dt * velocity.y;

		/*
		if (position.y < params.canvas.height) {
			velocity.y += params.dt * GRAVITY;
		}
		*/

		if (position.y <= 0 || position.y >= params.canvas.height - sprite.h) {
			//position.y = params.canvas.height;
			velocity.y = -velocity.y;
		}

		if (position.x <= 0 || position.x >= params.canvas.width - sprite.w) {
			velocity.x = -velocity.x;
		}
	}
}

class CollisionSystem extends ECS.System {
	constructor() {
		super([Collider, Position, Sprite, Input]);
	}

	beforeAll(entities: ECS.Entity[], params: ECS.UpdateParams): void {
		// TODO update pos, size and vel in AABBs
		// TODO insert / update position of AABBs in HashGrid

		dummyhashgrid = new Map();

		quadtree.clear();

		for (const entity of entities) {
			const sprite = entity.getComponent(Sprite) as Sprite;
			const position = entity.getComponent(Position) as Position;
			const velocity = entity.getComponent(Velocity) as Velocity;

			const rect = new ECS.AABB(
				new ECS.Vector(position.x, position.y),
				new ECS.Vector(sprite.w, sprite.h),
				velocity ? new ECS.Vector(velocity.x, velocity.y) : new ECS.Vector()
			);

			quadtree.insert(rect);
			dummyhashgrid.set(entity.id, rect);

			sprite.color = "green";
		}

		quadtree.debug_draw(params.context);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = entity.getComponent(Position) as Position;
		const velocity = entity.getComponent(Velocity) as Velocity;
		const sprite = entity.getComponent(Sprite) as Sprite;
		const input = entity.getComponent(Input) as Input;

		/*
		const rect = new ECS.AABB(
			new ECS.Vector(position.x, position.y),
			new ECS.Vector(sprite.w, sprite.h),
			velocity ? new ECS.Vector(velocity.x, velocity.y) : new ECS.Vector()
		);
		*/

		const rect = dummyhashgrid.get(entity.id);
		let possible = quadtree.retrieve(rect);

		// narrow phase testing
		for (let target_rect of possible) {
			if (target_rect == rect) continue;


			/*
			const target_pos = target.getComponent(Position) as Position;
			const target_sprite = target.getComponent(Sprite) as Sprite;
			const target_vel = target.getComponent(Velocity) as Velocity;

			const target_rect = new ECS.AABB(
				new ECS.Vector(target_pos.x, target_pos.y),
				new ECS.Vector(target_sprite.w, target_sprite.h),
				target_vel ? new ECS.Vector(target_vel.x, target_vel.y) : new ECS.Vector()
			);
			*/

			if (velocity) {
				let { collision, contact_normal, exit_point, contact_point, time } = ECS.DynamicRectVsRect(
					rect,
					target_rect,
					dt
				);
				if (collision) {
					//time = ECS.clamp(time, 0, 1)
					//console.log({time})

					velocity.x += contact_normal.x * Math.abs(velocity.x) * (1 - time);
					velocity.y += contact_normal.y * Math.abs(velocity.y) * (1 - time);

					params.context.fillStyle = "blue";
					params.context.fillRect(contact_point.x - 2, contact_point.y - 2, 4, 4);

					let v = contact_normal;
					let p = contact_point;
					v.scalarMult(10);
					let d = p.plus(v);
					params.context.beginPath();
					params.context.moveTo(p.x, p.y);
					params.context.lineTo(d.x, d.y);
					params.context.stroke();

					sprite.color = "red";
				}
			} else {
				let collision = ECS.RectVsRect(rect, target_rect);
				if (collision) sprite.color = "red";
			}
		}

		// line collision, just testing

		/*
		const origin = new ECS.Vector(input.lastX, input.lastY);
		const target = new ECS.Vector(input.mouseX, input.mouseY);

		params.context.strokeStyle  ="black"
		params.context.beginPath();
		params.context.moveTo(origin.x, origin.y);
		params.context.lineTo(target.x, target.y);
		params.context.stroke();

		let { collision, contact_normal, exit_point, contact_point, time } = ECS.RayVsRect(origin, target, rect);
		if (collision && time < 1) {
			
			sprite.color = "yellow";

			params.context.fillStyle = "blue";
			params.context.fillRect(contact_point.x - 2, contact_point.y - 2, 4, 4);

			params.context.fillStyle = "purple";
			params.context.fillRect(exit_point.x - 2, exit_point.y - 2, 4, 4);

			contact_normal.scalarMult(10);
			let p = contact_point.plus(contact_normal);
			params.context.beginPath();
			params.context.moveTo(contact_point.x, contact_point.y);
			params.context.lineTo(p.x, p.y);
			params.context.stroke();
		}
		*/
	}
}

/**
 * Setup
 */

const ecs = new ECS.ECS();
ecs.addSystem(new SpriteSystem());
ecs.addSystem(new InputSystem(canvas));
ecs.addSystem(new PhysicsSystem());
ecs.addSystem(new CollisionSystem());

/*
{
	const entity = new ECS.Entity();
	entity.addComponent(new Position(0, canvas.height - 30));
	entity.addComponent(new Sprite(canvas.width, 10, "green"));
	entity.addComponent(new Collider());
	entity.addComponent(new Input());
	dummyhashgrid.push(entity);
	ecs.addEntity(entity);
}
*/

for (let i = 0; i < 10; i++) {
	const entity = new ECS.Entity();
	let v = new ECS.Vector().random().normalize().scalarMult(SPEED);
	entity.addComponent(new Velocity(v.x, v.y));
	let w = 10;

	entity.addComponent(new Position(ECS.randomInteger(0, canvas.width), ECS.randomInteger(0, canvas.height)));

	entity.addComponent(new Sprite(w, w, "green"));
	entity.addComponent(new Collider());
	entity.addComponent(new Input());

	ecs.addEntity(entity);
}

let paused = false;
document.addEventListener("keydown", (e) => {
	if (e.code == "KeyP") {
		paused = !paused;
	}
});

/**
 * Game loop
 */
let dt: number = 0;
let then: number = 0;
function animate(now: number) {
	now *= 0.001;
	dt = now - then;
	then = now;
	if (dt > 1 / 30) dt = 1 / 30;

	if (!paused) {
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = "grey";
		context.fillRect(0, 0, canvas.width, canvas.height);

		ecs.update({ dt, canvas, context });
	}

	requestAnimationFrame(animate);
}

animate(0);
