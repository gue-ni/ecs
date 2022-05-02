import { randInt } from "three/src/math/MathUtils";
import { convertToObject } from "typescript";
import * as ECS from "../../../lib";
import { Input, InputSystem } from "./input";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

let paused = false;
const SPEED = 200;
const SIZE = 50;
const NUM = 5;
const quadtree = new ECS.QuadTree(
	0,
	new ECS.Rectangle(new ECS.Vector(), new ECS.Vector(canvas.width, canvas.height)),
	2,
	5
);

class Sprite extends ECS.Component {
	w: number;
	h: number;
	color: string;

	constructor(w: number, h: number, color: string) {
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

class Collider extends ECS.Component {
	aabb: ECS.AABB;
	contact_north: boolean = false;
	contact_south: boolean = false;
	contact_east: boolean = false;
	contact_west: boolean = false;
	constructor(width: number, height: number) {
		super();
		this.aabb = new ECS.AABB("", new ECS.Vector(), new ECS.Vector(width, height));
	}
}

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
		super([Position, Velocity, Sprite]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const sprite = entity.getComponent(Sprite) as Sprite;
		const position = entity.getComponent(Position) as Position;
		const velocity = entity.getComponent(Velocity) as Velocity;
		const collider = entity.getComponent(Collider) as Collider;

		position.x = position.x + params.dt * velocity.x;
		position.y = position.y + params.dt * velocity.y;

		const GRAVITY = 1000;
		//if (collider && !collider.contact_south){
		if (true) {
			velocity.y += params.dt * GRAVITY;
		}

		if (position.y > canvas.height - sprite.h) {
			position.y = canvas.height - sprite.h;
			//velocity.y = -velocity.y;
		}

		if (position.x <= 0 || position.x >= params.canvas.width - sprite.w) {
			position.x = ECS.clamp(position.x, 0, params.canvas.width - sprite.w);
			//velocity.x = -velocity.x;
		}
	}
}

class CollisionSystem extends ECS.System {
	constructor() {
		super([Collider, Position, Sprite]);
	}

	beforeAll(entities: ECS.Entity[], params: ECS.UpdateParams): void {
		quadtree.clear();

		for (const entity of entities) {
			const position = entity.getComponent(Position) as Position;
			const velocity = entity.getComponent(Velocity) as Velocity;
			const collider = entity.getComponent(Collider) as Collider;
			const sprite = entity.getComponent(Sprite) as Sprite;

			sprite.color = "green";

			collider.aabb.id = entity.id;
			collider.aabb.pos.set(position.x, position.y);
			if (velocity) {
				collider.aabb.vel.set(velocity.x, velocity.y);
			} else {
				collider.aabb.vel.set(0, 0);
			}

			quadtree.insert(collider.aabb);
		}
		quadtree.debug_draw(params.context, "#A0A0A0");
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const velocity = entity.getComponent(Velocity) as Velocity;
		if (!velocity) return;

		const position = entity.getComponent(Position) as Position;
		const collider = entity.getComponent(Collider) as Collider;
		const sprite = entity.getComponent(Sprite) as Sprite;

		const possible = quadtree.query(collider.aabb);

		const collisions = [];

		for (const target of possible) {
			if (target.id == entity.id) continue;

			const { collision, contact_normal, contact_point, time, debug_time } = ECS.DynamicRectVsRect(
				collider.aabb,
				target,
				dt
			);
			if (collision) {
				collisions.push({ time, contact_normal, contact_point, target, debug_time });
				sprite.color = "red";
			}
		}

		collisions.sort((a, b) => {
			return a.time - b.time;
		});

		const _DEBUG = true;

		if (_DEBUG) {
			const a = new ECS.Vector(
				collider.aabb.pos.x + collider.aabb.size.x / 2,
				collider.aabb.pos.y + collider.aabb.size.y / 2
			);
			const b = new ECS.Vector(a.x + collider.aabb.vel.x, a.y + collider.aabb.vel.y);

			params.context.strokeStyle = "white";
			params.context.beginPath();
			params.context.moveTo(a.x, a.y);
			params.context.lineTo(b.x, b.y);
			params.context.stroke();
		}

		collider.contact_south = false;

		for (const { time, contact_normal, target, contact_point } of collisions) {
			if (contact_normal.y == -1) collider.contact_south = true;

			velocity.x += contact_normal.x * Math.abs(velocity.x) * (1 - time);
			velocity.y += contact_normal.y * Math.abs(velocity.y) * (1 - time);

			if (_DEBUG) {
				params.context.strokeStyle = "white";
				params.context.strokeRect(
					target.pos.x - collider.aabb.size.x / 2,
					target.pos.y - collider.aabb.size.y / 2,
					target.size.x + collider.aabb.size.x,
					target.size.y + collider.aabb.size.y
				);

				params.context.fillStyle = "blue";
				params.context.fillRect(contact_point.x - 2, contact_point.y - 2, 4, 4);

				/*
				params.context.fillStyle = "purple";
				params.context.fillRect(exit_point.x - 2, exit_point.y - 2, 4, 4);
				*/
			}
		}
	}
}

class MovementSystem extends ECS.System {
	constructor() {
		super([Input, Velocity]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		const velocity = entity.getComponent(Velocity) as Velocity;

		const SPEED = 150;
		const JUMP = 300;

		if (input.is_key_pressed("ArrowLeft")) {
			velocity.x = -SPEED;
		} else if (input.is_key_pressed("ArrowRight")) {
			velocity.x = SPEED;
		} else {
			velocity.x = 0;
		}

		if (input.is_key_pressed("ArrowUp", 500)) velocity.y = -JUMP;
	}
}

const ecs = new ECS.ECS();
ecs.addSystem(new InputSystem(canvas));
ecs.addSystem(new MovementSystem());
ecs.addSystem(new CollisionSystem());
ecs.addSystem(new PhysicsSystem());
ecs.addSystem(new SpriteSystem());

const TILESIZE = 16;

{
	let v = new ECS.Vector().random().normalize().scalarMult(200);

	const entity = new ECS.Entity();
	entity.addComponent(new Position(50, 50));
	entity.addComponent(new Sprite(TILESIZE, TILESIZE, "green"));
	entity.addComponent(new Velocity(0, 0));
	entity.addComponent(new Velocity(v.x, v.y));
	entity.addComponent(new Collider(TILESIZE, TILESIZE));
	entity.addComponent(new Input());
	ecs.addEntity(entity);
}

const boxes = [
	[2, 2],
	[3, 2],
	[4, 2],
	[5, 3],
	[6, 3],
	[7, 3],
	[8, 2],
	[9, 2],
	[10, 2],
	[12, 4],
	[13, 4],
	[15, 2],
	[6, 6],
];

for (const [x, y] of boxes) {
	const entity = new ECS.Entity();

	/*
	entity.addComponent(
		new Position(ECS.randomInteger(0, canvas.width - 32), ECS.randomInteger(0, canvas.height - 32))
	);
	*/
	entity.addComponent(new Position(x * TILESIZE, canvas.height - y * TILESIZE));
	entity.addComponent(new Sprite(TILESIZE, TILESIZE, "green"));
	entity.addComponent(new Collider(TILESIZE, TILESIZE));

	let v = new ECS.Vector().random().normalize().scalarMult(200);
	//entity.addComponent(new Velocity(v.x, v.y));

	ecs.addEntity(entity);
}

let dt: number = 0;
let then: number = 0;
function animate(now: number) {
	now *= 0.001;
	dt = now - then;
	then = now;
	if (dt > 1 / 30) dt = 1 / 30;

	if (!paused) {
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = "#D3D3D3";
		context.fillRect(0, 0, canvas.width, canvas.height);

		ecs.update({ dt, canvas, context });
	}

	requestAnimationFrame(animate);
}

document.addEventListener("keydown", (e) => {
	if (e.code == "KeyP") paused = !paused;
});

animate(0);
