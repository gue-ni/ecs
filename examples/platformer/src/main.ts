import * as ECS from "../../../src";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

let paused = false;

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

class SpriteSystem extends ECS.System {
	constructor() {
		super([Sprite, ECS.Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const rect = entity.getComponent(Sprite) as Sprite;
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		params.context.strokeStyle = rect.color;
		params.context.strokeRect(Math.round(position.x), Math.round(position.y), rect.w, rect.h);
	}
}

class PhysicsSystem extends ECS.System {
	constructor() {
		super([ECS.Position, ECS.Velocity, Sprite]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const sprite = entity.getComponent(Sprite) as Sprite;
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;

		position.x = position.x + params.dt * velocity.x;
		position.y = position.y + params.dt * velocity.y;

		const GRAVITY = 1000;
		velocity.y += params.dt * GRAVITY;

		if (position.y > canvas.height - sprite.h) {
			position.y = canvas.height - sprite.h;
		}

		position.x = ECS.clamp(position.x, 0, params.canvas.width - sprite.w);
	}
}

class MovementSystem extends ECS.System {
	constructor() {
		super([ECS.Input, ECS.Velocity]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(ECS.Input) as ECS.Input;
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;

		const SPEED = 200;
		const JUMP = 300;


		if (input.is_key_pressed("ArrowLeft")) {
			velocity.x = -SPEED;
		} else if (input.is_key_pressed("ArrowRight")) {
			velocity.x = SPEED;
		} else {
			velocity.x = 0;
		}

		if (input.is_key_pressed("ArrowUp", 500)) {
			velocity.y = -JUMP;
		}
	}
}

const ecs = new ECS.ECS();
ecs.addSystem(new ECS.InputSystem(canvas));
ecs.addSystem(new MovementSystem());
ecs.addSystem(new ECS.CollisionSystem(quadtree));
ecs.addSystem(new PhysicsSystem());
ecs.addSystem(new SpriteSystem());

const TILESIZE = 16;

{
	const entity = new ECS.Entity();

	let s = new Sprite(TILESIZE, TILESIZE, "green");
	let i = new ECS.Input();
	let p = new ECS.Position(50, 50);
	let v = new ECS.Velocity(0, 0);
	let c = new ECS.Collider(TILESIZE, TILESIZE);

	console.log(
		"sprite",
		ECS.getComponentType(s),
		"input",
		ECS.getComponentType(i),
		"position",
		ECS.getComponentType(p),
		"velocity",
		ECS.getComponentType(v),
		"collision",
		ECS.getComponentType(c)
	);

	entity.addComponent(s);
	entity.addComponent(i);
	entity.addComponent(p);
	entity.addComponent(v);
	entity.addComponent(c);
	ecs.addEntity(entity);
}

let boxes = [
	[0, 3],
	[0, 4],
	[0, 5],
	[0, 6],
	[0, 7],
	[0, 8],
	[0, 2],
	[0, 1],
	[1, 1],
	[2, 1],
	[3, 1],
	[4, 1],
	[5, 1],
	[6, 1],
	[7, 1],
	[8, 1],
	[9, 1],
	[10, 1],
	[13, 4],
	[14, 4],
	[15, 2],
	[6, 6],
	[7, 6],
	[8, 6],
];

for (const [x, y] of boxes) {
	const entity = new ECS.Entity();
	entity.addComponent(new ECS.Position(x * TILESIZE, canvas.height - y * TILESIZE));
	entity.addComponent(new Sprite(TILESIZE, TILESIZE, "green"));
	entity.addComponent(new ECS.Collider(TILESIZE, TILESIZE));
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
