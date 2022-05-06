import * as ECS from "../../../src";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

let paused = false;

const JUMP = 400;
const ACCELERATION = 3;
const MIN_SPEED = 100;
const MAX_SPEED = 170;
const GRAVITY = 1500;
const DASH_SPEED = 700;
const DASH_DURATION = 100;

const quadtree = new ECS.QuadTree(
	0,
	new ECS.Rectangle(new ECS.Vector(), new ECS.Vector(canvas.width, canvas.height)),
	2,
	5
);

class Speed extends ECS.Component {
	interpolate: number = 0;
}

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

class Gravity extends ECS.Component {}

class Jump extends ECS.Component {
	count: number = 2;
}

class Dash extends ECS.Component {
	value: number = 1;
	dashing: boolean = false;
}

class SpriteSystem extends ECS.System {
	constructor() {
		super([Sprite, ECS.Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const rect = entity.getComponent(Sprite) as Sprite;
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		params.context.strokeStyle = rect.color;
		params.context.strokeRect(Math.round(position.x) - 0.5, Math.round(position.y) - 0.5, rect.w, rect.h);
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

		if (entity.getComponent(Gravity)) {
			velocity.y += params.dt * GRAVITY;
		}

		if (position.y > canvas.height - sprite.h) {
			position.y = canvas.height - sprite.h;
		}

		position.x = ECS.clamp(position.x, 0, params.canvas.width - sprite.w);
	}
}

class MovementSystem extends ECS.System {
	constructor() {
		super([ECS.Input, ECS.Velocity, ECS.Collider, Speed, Dash, Jump]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(ECS.Input) as ECS.Input;
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;
		const collider = entity.getComponent(ECS.Collider) as ECS.Collider;
		const speed = entity.getComponent(Speed) as Speed;
		const dash = entity.getComponent(Dash) as Dash;
		const jump = entity.getComponent(Jump) as Jump;

		const SPEED = ECS.lerp(MIN_SPEED, MAX_SPEED, ECS.clamp(speed.interpolate, 0, 1));

		if (input.is_key_pressed("ArrowUp", 250) && jump.count < 1) {
			velocity.y = -JUMP;
			jump.count++;
		}

		if (collider.south) {
			jump.count = 0;
		}

		const execute_dash = (dir: number) => {
			entity.removeComponent(Gravity);

			dash.dashing = true;
			velocity.set(dir * DASH_SPEED, 0);

			setTimeout(() => {
				dash.dashing = false;
				velocity.set(0, 0);
				entity.addComponent(new Gravity());
			}, DASH_DURATION);

			setTimeout(() => {
				dash.value = 1;
			}, 4000);
		};

		if (!dash.dashing && !collider.south) {
			if (input.is_double_pressed("ArrowLeft", 250)) {
				console.log("double pressed ArrowLeft");
				execute_dash(-1);
				return;
			}
			if (input.is_double_pressed("ArrowRight", 250)) {
				console.log("double pressed ArrowRight");
				execute_dash(1);
				return;
			}
		}

		if (!dash.dashing) {
			if (input.is_key_pressed("ArrowLeft")) {
				speed.interpolate += params.dt * ACCELERATION;
				velocity.x = -SPEED;
			} else if (input.is_key_pressed("ArrowRight")) {
				speed.interpolate += params.dt * ACCELERATION;
				velocity.x = SPEED;
			} else {
				speed.interpolate = 0;
				if (collider.south) {
					velocity.x = 0;
				} else {
					velocity.x = velocity.x * 0.95; // simulate air resistance
				}
			}
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
	// player
	ecs.addEntity(
		new ECS.Entity().addComponents(
			new Sprite(TILESIZE, TILESIZE, "red"),
			new Speed(),
			new Gravity(),
			new Dash(),
			new Jump(),
			new ECS.Player(),
			new ECS.Input(),
			new ECS.Position(50, 50),
			new ECS.Velocity(0, 0),
			new ECS.Collider(TILESIZE, TILESIZE)
		)
	);
}

const boxes = [
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
	[10, 2],
	[10, 3],
	[11, 1],
	[12, 1],
	[13, 1],
	[14, 1],
	[15, 1],
	[16, 1],
	[17, 1],
	[18, 1],
	[19, 1],
	[13, 4],
	[14, 4],
	[6, 6],
	[7, 6],
	[8, 6],
	[19, 2],
	[19, 3],
	[19, 4],
	[5, 3],
];

for (const [x, y] of boxes) {
	const entity = new ECS.Entity().addComponents(
		new ECS.Position(x * TILESIZE, canvas.height - y * TILESIZE),
		new Sprite(TILESIZE, TILESIZE, "green"),
		new ECS.Collider(TILESIZE, TILESIZE)
	);
	ecs.addEntity(entity);
}

const fps: HTMLElement = document.getElementById("fps-display") as HTMLElement;

let dt: number = 0;
let then: number = 0;
let timer = 0;
function animate(now: number) {
	now *= 0.001;
	dt = now - then;
	then = now;

	if ((timer += dt) > 1) {
		timer = 0;
		fps.innerText = `${(1 / dt).toFixed(2)}`;
	}

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
