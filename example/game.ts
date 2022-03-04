import * as ECS from "lofi-ecs";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d");

const characterSprite = new Image();
characterSprite.src = "assets/sprite.png";

const grenadeSprite = new Image();
grenadeSprite.src = "assets/grenade.png";

const bulletSprite = new Image();
bulletSprite.src = "assets/bullet.png";

const treeSprite = new Image();
treeSprite.src = "assets/tree.png";

let windowOffset = 0;
let windowCenter = 0;
windowCenter = canvas.width / 2;

/**
 * Components
 */
class Vector extends ECS.Component {
	x: number;
	y: number;

	constructor(x, y) {
		super();
		this.x = x;
		this.y = y;
	}
}

class Ammo extends ECS.Component {}

class Primary extends ECS.Component {}

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

/**
 * Systems
 */
class ScrollSystem extends ECS.System {
	constructor() {
		super([Primary, Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = entity.getComponent(Position) as Position;

		let maxDiff = 40;
		let diff = position.x - windowCenter;

		//console.log({ diff, x: position.x, windowOffset, windowCenter });

		if (diff > maxDiff) {
			let delta = diff - maxDiff;
			windowOffset += delta;
			windowCenter += delta;
		}

		if (diff < -maxDiff) {
			let delta = maxDiff + diff;
			windowCenter += delta;
			windowOffset += delta;
		}
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
		const position = entity.getComponent(Position) as Position;

		velocity.x = 0;
		const speed = 150;

		if (this.is_pressed(input, "KeyD")) velocity.x = 1 * speed;

		if (this.is_pressed(input, "KeyA")) velocity.x = -1 * speed;

		if (this.is_pressed(input, "KeyW", 200) && position.y == params.canvas.height) {
			velocity.y = -200;
		}
	}
}

class WeaponSystem extends ECS.System {
	constructor() {
		super([Input, Position, Ammo]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		const position = entity.getComponent(Position) as Position;

		if (input.is_pressed("Space", 200)) {
			const projectile = new ECS.Entity(1);
			projectile.addComponent(new Position(position.x + 6, position.y - 5, false));
			projectile.addComponent(new Velocity(300, -50));
			projectile.addComponent(new Sprite(grenadeSprite, 9, 3, 0, 0, 1, 1));
			params.ecs.addEntity(projectile);
		}

		if (input.is_pressed("KeyF", 50)) {
			const projectile = new ECS.Entity(1);
			projectile.addComponent(new Position(position.x + 6, position.y - 5, false));
			projectile.addComponent(new Velocity(500, -10));
			projectile.addComponent(new Sprite(bulletSprite, 9, 3, 0, 0, 1, 1));
			params.ecs.addEntity(projectile);
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

			/*a
			if (position.x > params.canvas.width) {
				position.x = params.canvas.width;
				velocity.x = 0;
			}
			*/

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
			coords.x - Math.round(sprite.width / 2) - windowOffset,
			coords.y - Math.round(sprite.height),
			sprite.width,
			sprite.height
		);
	}
}

/**
 * Setup
 */
const ecs = new ECS.ECS();

ecs.addSystem(new InputSystem());
ecs.addSystem(new PhysicsSystem());
ecs.addSystem(new ScrollSystem());
ecs.addSystem(new MovementSystem());
ecs.addSystem(new WeaponSystem());
ecs.addSystem(new SpriteSystem());

for (let i = 0; i < 10; i++) {
	const tree = new ECS.Entity();
	tree.addComponent(new Position(i * 50, canvas.height));
	tree.addComponent(new Sprite(treeSprite, 16, 16, 0, 0, 1, 1));
	ecs.addEntity(tree);
}

const player = new ECS.Entity();
player.addComponent(new Velocity(0, 0));
player.addComponent(new Input());
player.addComponent(new Ammo());
player.addComponent(new Primary());
player.addComponent(new Position(windowCenter, canvas.height));
player.addComponent(new Sprite(characterSprite, 16, 16, 0, 0, 1, 1));
ecs.addEntity(player);



let dt: number = 0;
let then: number = 0;

/**
 * Game Loop
 */
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
