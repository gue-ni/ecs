//import * as ECS from "lofi-ecs";
import * as ECS from "../../lib";
import { SpatialHashGrid, BoundingBox } from "./spatial-hash-grid";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

const characterSprite = new Image();
characterSprite.src = "assets/sprites.png";

const lightSprite = new Image();
lightSprite.src = "assets/light.png";

const lightSprite2 = new Image();
lightSprite2.src = "assets/light2.png";

const bulletSprite = new Image();
bulletSprite.src = "assets/bullet.png";

const boxSprite = new Image();
boxSprite.src = "assets/box.png";

const pixelSprite = new Image();
pixelSprite.src = "assets/pixel.png";

const smallLight = new Image();
smallLight.src = "assets/small-light.png";

let windowOffsetX = 0;
let windowCenterX = canvas.width / 2;

class Vector {
	x: number;
	y: number;
	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	scalarMult(v: number): void {
		this.x *= v;
		this.y *= v;
	}

	magnitude(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	normalize(): void {
		let mag = this.magnitude();
		this.x /= mag;
		this.y /= mag;
	}
}

class Velocity extends ECS.Component {
	x: number;
	y: number;

	constructor(x, y) {
		super();
		this.x = x;
		this.y = y;
	}
}

class Weapons extends ECS.Component {}

class Primary extends ECS.Component {}

class Static extends ECS.Component {}

class Dynamic extends ECS.Component {}

class Direction extends ECS.Component {
	right: boolean = true;
}

class Position extends ECS.Component {
	_x: number;
	_y: number;
	clamp: boolean;
	changed: boolean;

	constructor(x: number, y: number, clamp: boolean = true) {
		super();
		this._x = x;
		this._y = y;
		this.clamp = clamp;
		this.changed = true;
	}

	get x() {
		return Math.floor(this._x);
	}

	get y() {
		return Math.floor(this._y);
	}

	set x(x) {
		this.changed = true;
		this._x = x;
	}

	set y(y) {
		this.changed = true;
		this._y = y;
	}
}

class SpriteState {
	name: string;
	frameX: number;
	frameY: number;
	frames: number;
	duration: number;
	timeLeft: number;

	/**
	 *
	 * @param name name of state
	 * @param row
	 * @param frames
	 * @param duration play for this time, then go back to idle
	 */
	constructor(name: string, row: number, frames: number, duration: number = -1) {
		this.name = name;
		this.frameX = 0;
		this.frameY = row;
		this.frames = frames;
		this.duration = duration;
		this.timeLeft = 0;
	}
}

class Light extends ECS.Component {
	image: HTMLImageElement;
	width: number;
	height: number;
	yOffset: number;
	constructor(image: HTMLImageElement, w: number, h: number, yOffset: number = 0) {
		super();
		this.image = image;
		this.width = w;
		this.height = h;
		this.yOffset = yOffset;
	}
}

class Sprite extends ECS.Component {
	image: HTMLImageElement;
	width: number;
	height: number;

	states: SpriteState[];
	state: SpriteState;
	time: number;
	flushBottom: boolean = true;

	/**
	 *
	 * @param image
	 * @param width
	 * @param height
	 * @param states
	 */
	constructor(image: HTMLImageElement, width: number, height: number, states: SpriteState[] = []) {
		super();
		this.image = image;
		this.width = width;
		this.height = height;
		this.time = 0;

		this.states = [];

		if (states.length == 0) {
			this.state = new SpriteState("idle", 0, 1);
		} else {
			this.state = states[0];
			for (let s of states) {
				this.addState(s);
			}
		}
	}

	addState(state: SpriteState) {
		this.states[state.name] = state;
	}

	setState(name: string) {
		this.state = this.states[name];
		this.state.timeLeft = 0;
	}
}

class Explosive extends ECS.Component {}

class Destructible extends ECS.Component {}

class Input extends ECS.Component {
	pressed: any;
	last_pressed: any;
	mouseY: number;
	mouseX: number;

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

class CameraSystem extends ECS.System {
	constructor() {
		super([Primary, Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = entity.getComponent(Position) as Position;

		let maxDiff = 40;
		let diffX = position.x - windowCenterX;

		if (diffX > maxDiff) {
			let delta = diffX - maxDiff;
			windowOffsetX += delta;
			windowCenterX += delta;
		}

		if (diffX < -maxDiff) {
			let delta = maxDiff + diffX;
			windowCenterX += delta;
			windowOffsetX += delta;
		}
	}
}

class InputSystem extends ECS.System {
	keys: any;
	mouseX: number;
	mouseY: number;

	constructor() {
		super([Input]);

		this.keys = {};

		window.addEventListener("keydown", (e) => {
			this.keys[e.code] = true;
		});

		window.addEventListener("keyup", (e) => {
			delete this.keys[e.code];
		});

		canvas.addEventListener("mousemove", (e) => {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			this.mouseX = Math.round((e.clientX - rect.left) * scaleX);
			this.mouseY = Math.round((e.clientY - rect.top) * scaleY);
		});
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		input.pressed = { ...this.keys };
		input.mouseX = this.mouseX;
		input.mouseY = this.mouseY;
	}
}

class MovementSystem extends ECS.System {
	constructor() {
		super([Input, Velocity, BoundingBox, Position, Direction]);
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
		const aabb = entity.getComponent(BoundingBox) as BoundingBox;
		const position = entity.getComponent(Position) as Position;
		const sprite = entity.getComponent(Sprite) as Sprite;
		const direction = entity.getComponent(Direction) as Direction;

		velocity.x = 0;
		const speed = 100;

		let off = position.x - windowOffsetX;
		let diff = input.mouseX - off;
		direction.right = diff > 0;
		//console.log({right: direction.right, diff, mouse: input.mouseX, off, p: position.x})

		sprite.setState(direction.right ? "idle-right" : "idle-left");

		if (this.is_pressed(input, "KeyD")) {
			sprite.setState("run-right");
			direction.right = true;
			velocity.x = speed;
		}

		if (this.is_pressed(input, "KeyA")) {
			sprite.setState("run-left");
			direction.right = false;
			velocity.x = -speed;
		}

		if (
			this.is_pressed(input, "KeyW") &&
			(aabb.bottomCollision || position.y == params.canvas.height) &&
			!aabb.topCollision
		) {
			velocity.y = -150;
		}

		if (!(aabb.bottomCollision || position.y == params.canvas.height)) {
			sprite.setState(direction.right ? "jump-right" : "jump-left");
		}
	}
}

class WeaponSystem extends ECS.System {
	constructor() {
		super([Input, Position, Weapons]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		const position = entity.getComponent(Position) as Position;

		let gunPosOffset = 8;
		let dir = new Vector(input.mouseX - (position.x - windowOffsetX), input.mouseY - (position.y - gunPosOffset));
		dir.normalize();

		if (input.is_pressed("Space", 500)) {
			dir.scalarMult(300);
			let sprite = new Sprite(bulletSprite, 4, 4);
			sprite.flushBottom = false;
			const projectile = new ECS.Entity(2)
				.addComponent(new Position(position.x, position.y - gunPosOffset, false))
				.addComponent(new Velocity(dir.x, dir.y))
				.addComponent(new Light(lightSprite2, 128, 128))
				.addComponent(sprite);
			params.ecs.addEntity(projectile);
		}

		if (input.is_pressed("KeyF", 100)) {
			dir.scalarMult(500);
			const projectile = new ECS.Entity(1)
				.addComponent(new Position(position.x, position.y - gunPosOffset, false))
				.addComponent(new Velocity(dir.x, dir.y))
				.addComponent(new Sprite(pixelSprite, 1, 1))
				.addComponent(new Light(smallLight, 16, 16))
				.addComponent(new BoundingBox(1, 1, 1, 1, 0, true))
				.addComponent(new Explosive());
			params.ecs.addEntity(projectile);
		}
	}
}

class PositionChangeSystem extends ECS.System {
	constructor() {
		super([Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = entity.getComponent(Position) as Position;
		position.changed = false;
	}
}

class PhysicsSystem extends ECS.System {
	constructor() {
		super([Position, Velocity]); // necessary Components
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const velocity = entity.getComponent(Velocity) as Velocity;
		const position = entity.getComponent(Position) as Position;
		const aabb = entity.getComponent(BoundingBox) as BoundingBox;

		// debug

		position.x += params.dt * velocity.x;
		position.y += params.dt * velocity.y;

		if (position.y < params.canvas.height && (!aabb || !aabb.bottomCollision)) {
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
			/*
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

class LightSystem extends ECS.System {
	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;

	constructor() {
		super([Light, Position]);

		this.canvas = document.createElement("canvas");
		this.context = this.canvas.getContext("2d");
		this.canvas.width = canvas.width;
		this.canvas.height = canvas.height;

		this.beforeUpdate = (entities: ECS.Entity[], params: ECS.UpdateParams) => {
			this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.context.fillStyle = "rgba(0, 0, 0, 0.99)";
			this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
			return entities;
		};

		this.afterUpdate = (entities: ECS.Entity[], params: ECS.UpdateParams) => {
			this.context.globalCompositeOperation = "source-over";
			params.context.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height);
			return entities;
		};
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const light = entity.getComponent(Light) as Light;
		const coords = entity.getComponent(Position) as Position;

		// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation

		this.context.globalCompositeOperation = "destination-out";
		this.context.drawImage(
			light.image,
			0,
			0,
			light.width,
			light.height,
			coords.x - Math.round(light.width / 2) - windowOffsetX,
			coords.y - Math.round(light.height / 2) - light.yOffset,
			// coords.y - (light.flushBottom ? Math.round(light.height) : Math.round(light.height / 2)),
			light.width,
			light.height
		);
	}
}

class SpriteSystem extends ECS.System {
	constructor() {
		super([Sprite, Position]);
	}

	updateEntity(entity: ECS.Entity, params: any): void {
		const sprite = entity.getComponent(Sprite) as Sprite;
		const coords = entity.getComponent(Position) as Position;
		const direction = entity.getComponent(Direction) as Direction;

		if (sprite.state.frames > 1) {
			sprite.time += params.dt;
			if (sprite.time > 0.08) {
				sprite.time = 0;
				sprite.state.frameX = (sprite.state.frameX + 1) % sprite.state.frames;
			}
		}

		if (sprite.state.duration != -1) {
			sprite.state.timeLeft += params.dt;
			if (sprite.state.timeLeft > sprite.state.duration) {
				sprite.state.timeLeft = 0;

				if (direction) {
					sprite.setState(direction.right ? "idle-right" : "idle-left");
				} else {
					sprite.setState("idle");
				}
			}
		}

		//console.log(sprite.state.name, sprite.state.frameX, sprite.state.frameY);

		params.context.drawImage(
			sprite.image,
			sprite.state.frameX * sprite.width,
			sprite.state.frameY * sprite.height,
			sprite.width,
			sprite.height,
			coords.x - Math.round(sprite.width / 2) - windowOffsetX,
			coords.y - (sprite.flushBottom ? Math.round(sprite.height) : Math.round(sprite.height / 2)),
			sprite.width,
			sprite.height
		);
	}
}

class CollisionSystem extends ECS.System {
	sph: SpatialHashGrid;

	constructor() {
		super([Position, BoundingBox]);
		this.sph = new SpatialHashGrid(16);
	}

	_intersection(a: BoundingBox, b: BoundingBox): number[] | null {
		if (a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY) {
			let d0: number;
			let d1: number;

			d0 = a.maxX - b.minX;
			d1 = b.maxX - a.minX;
			let x = d0 < d1 ? d0 : -d1;

			d0 = a.maxY - b.minY;
			d1 = b.maxY - a.minY;
			let y = d0 < d1 ? d0 : -d1;

			//console.log(d0, d1, a.maxY, a.minY, b.maxY, b.minY);

			return [x, y];
		} else {
			return null;
		}
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		// update bounding box
		let aabb = entity.getComponent(BoundingBox) as BoundingBox;
		let position = entity.getComponent(Position) as Position;
		let velocity = entity.getComponent(Velocity) as Velocity;

		if (position.changed) {
			this.sph.remove(entity);
			aabb.set_center(position.x, position.y);
			this.sph.insert(entity);
		}

		aabb.topCollision = false;
		aabb.bottomCollision = false;

		if (aabb.active) {
			for (const possible of this.sph.possible_collisions(entity)) {
				const possible_aabb = possible.getComponent(BoundingBox) as BoundingBox;

				let depth = this._intersection(aabb, possible_aabb);
				if (depth) {
					if (entity.getComponent(Explosive) && possible.getComponent(Destructible)) {
						params.ecs.removeEntity(entity);
					}

					if (entity.getComponent(Dynamic) && possible.getComponent(Static)) {
						const [x, y] = depth;

						if (Math.abs(x) < Math.abs(y) - aabb.padding * 2) {
							position.x -= x;
						} else {
							if (y > 0) {
								if (y > aabb.padding) {
									velocity.y = Math.min(0, velocity.y);
									position.y -= y - aabb.padding;
								} else if (aabb.padding == y) {
									velocity.y = Math.min(0, velocity.y);
									aabb.bottomCollision = true;
								}
							} else if (y < 0) {
								if (Math.abs(y) > aabb.padding) {
									position.y -= y + aabb.padding;
									velocity.y = Math.max(0, velocity.y);
									//console.log("collision!", y)
								} else {
									aabb.topCollision = true;
									//console.log("only touching!", y)
								}
							}
						}
					}
				}
			}
			//console.log(aabb.bottomCollision)
		}
	}
}

class PlayerLogginSystem extends ECS.System {
	constructor() {
		super([Primary]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = entity.getComponent(Position) as Position;
		const velocity = entity.getComponent(Velocity) as Velocity;
		const aabb = entity.getComponent(BoundingBox) as BoundingBox;
		console.log(position.x, position.y, velocity.x.toFixed(2), velocity.y.toFixed(2), aabb.bottomCollision);
	}
}

const ecs = new ECS.ECS();
ecs.addSystem(new InputSystem());
ecs.addSystem(new CameraSystem());
ecs.addSystem(new PhysicsSystem());
ecs.addSystem(new CollisionSystem());
ecs.addSystem(new MovementSystem());
ecs.addSystem(new WeaponSystem());
ecs.addSystem(new SpriteSystem());
ecs.addSystem(new LightSystem());
ecs.addSystem(new PositionChangeSystem());
//ecs.addSystem(new PlayerLogginSystem());

const player = new ECS.Entity();
player.addComponent(new Velocity(0, 0));
player.addComponent(new Input());
player.addComponent(new Weapons());
player.addComponent(new Direction());
player.addComponent(new Dynamic());
player.addComponent(new Primary());
player.addComponent(new Light(lightSprite, 128, 128, 12));
player.addComponent(new Position(windowCenterX, canvas.height));
player.addComponent(
	new Sprite(characterSprite, 16, 16, [
		new SpriteState("idle-right", 0, 1),
		new SpriteState("jump-right", 1, 1),
		new SpriteState("run-right", 2, 4),
		new SpriteState("run-left", 3, 4),
		new SpriteState("idle-left", 4, 1),
		new SpriteState("jump-left", 5, 1),
	])
);
player.addComponent(new BoundingBox(16, 2, 0, 2, 3, true));
ecs.addEntity(player);

{
	let sprite = new Sprite(bulletSprite, 4, 4);
	sprite.flushBottom = false;
	ecs.addEntity(
		new ECS.Entity()
			.addComponent(new Position(16 * 6, canvas.height - 16 * 2 - 8))
			.addComponent(new Light(lightSprite2, 128, 128))
			.addComponent(sprite)
	);
}
/*
{
	let sprite = new Sprite(bulletSprite, 4, 4);
	sprite.flushBottom = false;
	ecs.addEntity(
		new ECS.Entity()
			.addComponent(new Position(16 * 13, canvas.height - 16 * 4 - 8))
			.addComponent(new Light(lightSprite2, 128, 128))
			.addComponent(sprite)
	);
}
*/


let boxes = [
	[16 * 4, 128],
	[16 * 6, 128],
	[16 * 8, 128 - 16 * 2],
	[16 * 9, 128 - 16 * 1],
	[16 * 10, 128 - 16 * 1],
	[16 * 13, 128 - 16 * 2],
	[16 * 10, 128 - 16 * 4],
	[16 * 14, 128 - 16 * 2],
];

for (let [x, y] of boxes) {
	const box = new ECS.Entity()
		.addComponent(new Position(x, y))
		.addComponent(new Sprite(boxSprite, 16, 16))
		.addComponent(new BoundingBox(16, 8, 0, 8, 0, false))
		.addComponent(new Destructible())
		.addComponent(new Static());
	ecs.addEntity(box);
}

let paused = false;
document.addEventListener("keydown", (e) => {
	if (e.code == "KeyP") {
		paused = !paused;
	}
});

let dt: number = 0;
let then: number = 0;

/**
 * Game Loop
 */
function animate(now: number) {
	now *= 0.001;
	dt = now - then;
	then = now;

	if (!paused) {
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = "rgb(0,0,0)";
		context.fillRect(0, 0, canvas.width, canvas.height);
		ecs.update({ dt, canvas, context, ecs });
	}
	requestAnimationFrame(animate);
}

animate(0);
