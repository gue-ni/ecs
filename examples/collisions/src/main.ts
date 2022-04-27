import * as ECS from "../../../lib";
import { Input, InputSystem } from "./input";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

const GRAVITY = 500;
const dummyhashgrid: ECS.Entity[] = [];

/**
 * Components
 */

class RectSprite extends ECS.Component {
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

class RectSystem extends ECS.System {
	constructor() {
		super([RectSprite, Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const rect = entity.getComponent(RectSprite) as RectSprite;
		const position = entity.getComponent(Position) as Position;
		params.context.fillStyle = rect.color;
		params.context.fillRect(position.x, position.y, rect.w, rect.h);
	}
}

class PhysicsSystem extends ECS.System {
	constructor() {
		super([Position, Velocity]); // necessary Components
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = entity.getComponent(Position) as Position;
		const velocity = entity.getComponent(Velocity) as Velocity;

		//const rect = entity.getComponent(RectSprite) as RectSprite;
		//console.log("velocity", velocity.name, "position", position.name, "rect", rect.name);

		position.x = position.x + params.dt * velocity.x;
		position.y = position.y + params.dt * velocity.y;

		if (position.y < params.canvas.height) {
			velocity.y += params.dt * GRAVITY;
		}

		if (position.y >= params.canvas.height) {
			position.y = params.canvas.height;
			velocity.y = -velocity.y;
		}

		if (position.x <= 0 || position.x >= params.canvas.width) {
			velocity.x = -velocity.x;
		}
	}
}

class CollisionSystem extends ECS.System {
	constructor() {
		super([Collider, Position, RectSprite, Input]);
	}

	beforeAll(entities: ECS.Entity[], params: ECS.UpdateParams): void {
		for (let entity of entities) {
			const sprite = entity.getComponent(RectSprite) as RectSprite;
			sprite.color = "green";
		}
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = entity.getComponent(Position) as Position;
		const sprite = entity.getComponent(RectSprite) as RectSprite;
		const input = entity.getComponent(Input) as Input;

		const rect = new ECS.Rectangle(new ECS.Vector(position.x, position.y), new ECS.Vector(sprite.w, sprite.h));

		for (let target of dummyhashgrid) {
			if (target.id == entity.id) continue;
			const target_pos = target.getComponent(Position) as Position;
			const target_rect = new ECS.Rectangle(new ECS.Vector(target_pos.x, target_pos.y), new ECS.Vector(30, 30));

			if (ECS.RectVsRect(rect, target_rect)) {
				sprite.color = "red";
			}
		}

		const origin = new ECS.Vector(0, 0);
		const target = new ECS.Vector(input.mouseX, input.mouseY);

		let { collision, contact_normal, contact_point, time } = ECS.RayVsRect(origin, target, rect);
		if (collision && time <= 1) {
			sprite.color = "red";

			params.context.fillStyle = "blue";
			params.context.fillRect(contact_point.x - 2, contact_point.y - 2, 4, 4);

			console.log(contact_normal.x, contact_normal.y)

			contact_normal.scalarMult(10)
			let p = contact_point.plus(contact_normal)

			params.context.beginPath();
			params.context.moveTo(contact_point.x, contact_point.y);
			params.context.lineTo(p.x, p.y)
			params.context.stroke()

			//console.log({ contact_normal, contact_point });
		}

		params.context.beginPath();
		params.context.moveTo(origin.x, origin.y);
		params.context.lineTo(target.x, target.y);
		params.context.stroke();
	}
}

/**
 * Setup
 */

const randomFloat = (min: number, max: number): number => Math.random() * (max - min) + min;

const ecs = new ECS.ECS();

ecs.addSystem(new RectSystem());
ecs.addSystem(new PhysicsSystem());
ecs.addSystem(new CollisionSystem());
ecs.addSystem(new InputSystem(canvas));

/*
for (let i = 0; i < 5; i++) {
	let v = new Velocity(randomFloat(-200, 200), 0);
	let p = new Position(randomFloat(0, canvas.width), randomFloat(0, canvas.height * 0.8));
	let r = new RectSprite(30, 30, "green");
	let c = new Collider();

	//console.log("vel", v.name, "pos", p.name, "rect", r.name)

	const entity = new ECS.Entity().addComponent(v).addComponent(p).addComponent(r).addComponent(c);
	dummyhashgrid.push(entity);


	ecs.addEntity(entity);
}
*/

{
	const entity = new ECS.Entity();
	entity.addComponent(new Position(canvas.width / 2, canvas.height / 2));
	entity.addComponent(new RectSprite(50, 50, "green"));
	entity.addComponent(new Collider());
	entity.addComponent(new Input());
	dummyhashgrid.push(entity);
	ecs.addEntity(entity);
}

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

	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = "grey";
	context.fillRect(0, 0, canvas.width, canvas.height);

	ecs.update({ dt, canvas, context });
	requestAnimationFrame(animate);
}

animate(0);
