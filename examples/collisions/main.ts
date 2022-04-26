import * as ECS from "../../lib";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

const GRAVITY = 500;

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

/**
 * Systems
 */

class RectSystem extends ECS.System {
	constructor() {
		super([RectSprite, ECS.Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const rect = entity.getComponent(RectSprite) as RectSprite;
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		params.context.fillStyle = rect.color;
		params.context.fillRect(position.x, position.y, rect.w, rect.h);
	}
}

class PhysicsSystem extends ECS.System {
	constructor() {
		super([ECS.Position, ECS.Velocity]); // necessary Components
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;
		
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

/**
 * Setup
 */

const ecs = new ECS.ECS();

ecs.addSystem(new RectSystem());
ecs.addSystem(new PhysicsSystem());

for (let i = 0; i < 1; i++) {
	let v = new ECS.Velocity(Math.random() * 200 - 100, 0);
	let p = new ECS.Position(Math.floor(Math.random() * canvas.width), Math.floor(Math.random() * canvas.height));
	let r = new RectSprite(10, 10);

	console.log("vel", v.name, "pos", p.name, "rect", r.name)

	const entity = new ECS.Entity().addComponent(v).addComponent(p).addComponent(r);

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
	context.fillStyle = "#000";
	context.fillRect(0, 0, canvas.width, canvas.height);

	ecs.update({ dt, canvas, context });
	requestAnimationFrame(animate);
}

animate(0);
