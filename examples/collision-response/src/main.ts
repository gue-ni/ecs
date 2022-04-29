import * as ECS from "../../../lib";
import { Input, InputSystem } from "./input";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

const GRAVITY = 200;
const SPEED = 150;
let colliders: Map<string, ECS.AABB> = new Map();
const quadtree = new ECS.QuadTree(
	0,
	new ECS.Rectangle(new ECS.Vector(), new ECS.Vector(canvas.width, canvas.height)),
	2,
	5
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
	x: number;
	y: number;

	constructor(x: number, y: number) {
		super();
		this.x = x;
		this.y = y;
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
		params.context.strokeRect(Math.round(position.x), Math.round(position.y), rect.w, rect.h);
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

		position.x = position.x + params.dt * velocity.x;
		position.y = position.y + params.dt * velocity.y;

		if (position.y <= 0 || position.y >= params.canvas.height - sprite.h) {
			position.y = ECS.clamp(position.y, 0, params.canvas.height - sprite.h);
			velocity.y = -velocity.y;
		}

		if (position.x <= 0 || position.x >= params.canvas.width - sprite.w) {
			position.x = ECS.clamp(position.x, 0, params.canvas.width - sprite.w);
			velocity.x = -velocity.x;
		}
	}
}

class CollisionSystem extends ECS.System {
	constructor() {
		super([Collider, Position, Sprite, Input]);
	}

	beforeAll(entities: ECS.Entity[], params: ECS.UpdateParams): void {
		colliders = new Map();
		quadtree.clear();

		for (const entity of entities) {
			const sprite = entity.getComponent(Sprite) as Sprite;
			const position = entity.getComponent(Position) as Position;
			const velocity = entity.getComponent(Velocity) as Velocity;

			const rect = new ECS.AABB(
				entity.id,
				new ECS.Vector(position.x, position.y),
				new ECS.Vector(sprite.w, sprite.h),
				velocity ? new ECS.Vector(velocity.x, velocity.y) : new ECS.Vector()
			);

			quadtree.insert(rect);
			colliders.set(entity.id, rect);

			sprite.color = "green";
		}
		quadtree.debug_draw(params.context, "black");
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const velocity = entity.getComponent(Velocity) as Velocity;
		const sprite = entity.getComponent(Sprite) as Sprite;
		const input = entity.getComponent(Input) as Input;

		const rect = colliders.get(entity.id);
		const possible = quadtree.retrieve(rect);

		for (const target of possible) {
			if (target.id == rect.id) continue;

			if (velocity) {
				let { collision, contact_normal, exit_point, contact_point, time } = ECS.DynamicRectVsRect(
					rect,
					target,
					dt
				);
				if (collision && time <= 1) {
					//time = ECS.clamp(time, 0, 1);
					console.log({ id: entity.id, time: time.toFixed(2) });


					velocity.x += contact_normal.x * Math.abs(velocity.x) * (1 - time);
					velocity.y += contact_normal.y * Math.abs(velocity.y) * (1 - time);

					/*
					params.context.strokeStyle = "white";
					params.context.strokeRect(
						target.pos.x - rect.size.x / 2,
						target.pos.y - rect.size.y / 2,
						target.size.x + rect.size.x,
						target.size.y + rect.size.y
					);

					const origin = new ECS.Vector(rect.pos.x + rect.size.x / 2, rect.pos.y + rect.size.y / 2);
					const future_location = new ECS.Vector(origin.x + rect.vel.x, origin.y + rect.vel.y);

					params.context.strokeStyle = "white";
					params.context.beginPath();
					params.context.moveTo(origin.x, origin.y);
					params.context.lineTo(future_location.x, future_location.y);
					params.context.stroke();

					params.context.fillStyle = "blue";
					params.context.fillRect(contact_point.x - 2, contact_point.y - 2, 4, 4);

					params.context.fillStyle = "purple";
					params.context.fillRect(exit_point.x - 2, exit_point.y - 2, 4, 4);
					*/

					sprite.color = "red";
				}
			} else {
				let collision = ECS.RectVsRect(rect, target);
				if (collision) sprite.color = "blue";
			}
		}

		/*
		// line collision, just testing
		const origin = new ECS.Vector(input.lastX, input.lastY);
		const target = new ECS.Vector(input.mouseX, input.mouseY);

		params.context.strokeStyle = "black";
		params.context.beginPath();
		params.context.moveTo(origin.x, origin.y);
		params.context.lineTo(target.x, target.y);
		params.context.stroke();

		let { collision, contact_normal, exit_point, contact_point, time } = ECS.RayVsRect(origin, target, rect);
		if (collision && time <= 1) {
			sprite.color = "yellow";
			//console.log({ time: time.toFixed(2) });

			params.context.fillStyle = "blue";
			params.context.fillRect(contact_point.x - 2, contact_point.y - 2, 4, 4);

			params.context.fillStyle = "purple";
			params.context.fillRect(exit_point.x - 2, exit_point.y - 2, 4, 4);

			contact_normal.scalarMult(30);
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
	let w =  100;
	const entity = new ECS.Entity();
	entity.addComponent(new Position(ECS.randomInteger(0, canvas.width - w), ECS.randomInteger(0, canvas.height - w)));
	entity.addComponent(new Sprite(w, w, "green"));
	entity.addComponent(new Collider());
	entity.addComponent(new Input());
	ecs.addEntity(entity);
}
*/

for (let i = 0; i < 15; i++) {
	const entity = new ECS.Entity();
	let v = new ECS.Vector().random().normalize().scalarMult(SPEED);
	entity.addComponent(new Velocity(v.x, v.y));

	let w =  30;
	entity.addComponent(new Position(ECS.randomInteger(0, canvas.width - w), ECS.randomInteger(0, canvas.height - w)));
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
	//if (dt > 1 / 30) dt = 1 / 30;

	if (!paused) {
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = "#A0A0A0";
		context.fillRect(0, 0, canvas.width, canvas.height);

		ecs.update({ dt, canvas, context });
	}

	requestAnimationFrame(animate);
}

animate(0);
