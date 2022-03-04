import * as ECS from "lofi-ecs";

// debug
const posEl = document.getElementById("position");
const velEl = document.getElementById("velocity");

const sprite = new Image();
sprite.src = "assets/sprite.png";

const bulletSprite = new Image();
bulletSprite.src = "assets/bullet.png";

class Vector extends ECS.Component {
	x: number;
	y: number;

	constructor(x, y) {
		super();
		this.x = x;
		this.y = y;
	}
}

class Velocity extends Vector {}

class Position extends ECS.Component {
	_x: number;
	_y: number;
	clamp: boolean;

	constructor(x: number, y: number, clamp: boolean = true) {
		super();
		this._x = x;
		this._y = y;
		this.clamp = clamp;
	}

	get x() {
		return Math.floor(this._x);
	}

	get y() {
		return Math.floor(this._y);
	}

	set x(x) {
		this._x = x;
	}

	set y(y) {
		this._y = y;
	}
}

class Sprite extends ECS.Component {
	image: HTMLImageElement;
	width: number;
	height: number;
	frameX: number;
	frameY: number;
	maxFrameY: number;
	maxFrameX: number;
	animate: boolean;

	constructor(
		image: HTMLImageElement,
		width: number,
		height: number,
		frameX: number,
		frameY: number,
		maxFrameX: number,
		maxFrameY: number
	) {
		super();
		this.image = image;
		this.width = width;
		this.height = height;
		this.frameX = frameX || 0;
		this.frameY = frameY || 0;
		this.maxFrameX = maxFrameX || 1;
		this.maxFrameY = maxFrameY || 1;
		this.animate = false;
	}
}

class Input extends ECS.Component {
	pressed: any;
	last_pressed: any;

	constructor() {
		super();
		this.pressed = {};
		this.last_pressed = {};
	}

	is_pressed(key: string, delay?: number): boolean {
		if (this.pressed[key]) {
			if (!delay || !this.last_pressed[key] || Date.now() - this.last_pressed[key] > delay) {
				this.last_pressed[key] = Date.now();
				return true;
			}
		}
		return false;
	}
}

class InputSystem extends ECS.System {
	keys: any;

	constructor() {
		super([Input]);

		this.keys = {};

		window.addEventListener("keydown", (e) => {
			this.keys[e.code] = true;
		});

		window.addEventListener("keyup", (e) => {
			delete this.keys[e.code];
		});
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		input.pressed = { ...this.keys };
	}
}

class MovementSystem extends ECS.System {
	constructor() {
		super([Input, Velocity]);
	}

	is_pressed(input: Input, key: string, delay?: number): boolean {
		if (input.pressed[key]) {
			if (!delay || !input.last_pressed[key] || Date.now() - input.last_pressed[key] > delay) {
				input.last_pressed[key] = Date.now();
				return true;
			}
		}
		return false;
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		const velocity = entity.getComponent(Velocity) as Velocity;

		velocity.x = 0;
		const speed = 150;

		if (this.is_pressed(input, "KeyD")) velocity.x = 1 * speed;

		if (this.is_pressed(input, "KeyA")) velocity.x = -1 * speed;

		if (this.is_pressed(input, "KeyW", 500)) {
			velocity.y = -200;
		}
	}
}

class GunSystem extends ECS.System {
	constructor() {
		super([Input, Position]);
	}

	

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		const position = entity.getComponent(Position) as Position;

		if (input.is_pressed("Space", 200)) {
			let bullet = new ECS.Entity(1);
			bullet.addComponent(new Position(position.x, position.y - 8, false));
			bullet.addComponent(new Velocity(300, -50));
			bullet.addComponent(new Sprite(bulletSprite, 9, 3, 0, 0, 1, 1));
			params.ecs.addEntity(bullet);
		}
	}
}

class PhysicsSystem extends ECS.System {
	constructor() {
		super([Position, Velocity]); // necessary Components
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const velocity = entity.getComponent(Velocity) as Velocity;
		const position = entity.getComponent(Position) as Position;

		// debug
		velEl.innerText = `Velocity: ${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}`;
		posEl.innerText = `Position: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}`;

		position.x += params.dt * velocity.x;
		position.y += params.dt * velocity.y;

		if (position.y < params.canvas.height) {
			velocity.y += params.dt * 500;
		}

		if (position.clamp) {
			if (position.y > params.canvas.height) {
				position.y = params.canvas.height;
				velocity.y = 0;
			}

			if (position.y < 0) {
				position.y = 0;
				velocity.y = 0;
			}

			if (position.x > params.canvas.width) {
				position.x = params.canvas.width;
				velocity.x = 0;
			}

			if (position.x < 0) {
				position.x = 0;
				velocity.x = 0;
			}
		}
	}
}

class SpriteSystem extends ECS.System {
	constructor() {
		super([Sprite, Position]);
	}

	updateEntity(entity: ECS.Entity, params: any): void {
		const sprite = entity.getComponent(Sprite) as Sprite;
		const coords = entity.getComponent(Position) as Position;

		params.context.drawImage(
			sprite.image,
			sprite.frameX * sprite.width,
			sprite.frameY * sprite.height,
			sprite.width,
			sprite.height,
			coords.x - Math.round(sprite.width / 2),
			coords.y - Math.round(sprite.height),
			sprite.width,
			sprite.height
		);
	}
}

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d");

const ecs = new ECS.ECS();

ecs.addSystem(new InputSystem());
ecs.addSystem(new PhysicsSystem());
ecs.addSystem(new SpriteSystem());
ecs.addSystem(new MovementSystem());
ecs.addSystem(new GunSystem());

const entity = new ECS.Entity();
entity.addComponent(new Velocity(0, 0));
entity.addComponent(new Input());
entity.addComponent(new Position(10, canvas.height));
entity.addComponent(new Sprite(sprite, 16, 16, 0, 0, 1, 1));
ecs.addEntity(entity);

let dt: number = 0;
let then: number = 0;

function animate(now: number) {
	now *= 0.001;
	dt = now - then;
	then = now;

	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = "rgb(0,0,0)";
	context.fillRect(0, 0, canvas.width, canvas.height);

	ecs.update({ dt, canvas, context, ecs });
	requestAnimationFrame(animate);
}

animate(0);
