//import * as ECS from "lofi-ecs";
import { createEmitAndSemanticDiagnosticsBuilderProgram } from "typescript";
import * as ECS from "../lib";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

const characterSprite = new Image();
characterSprite.src = "assets/sprites.png";

const grenadeSprite = new Image();
grenadeSprite.src = "assets/grenade.png";

const bulletSprite = new Image();
bulletSprite.src = "assets/bullet.png";

const lightSprite = new Image();
lightSprite.src = "assets/light2.png";

const treeSprite = new Image();
treeSprite.src = "assets/tree.png";

const boxSprite = new Image();
boxSprite.src = "assets/box.png";

let windowOffsetX = 0;
let windowCenterX = canvas.width / 2;
let windowCenterY = 0;
let windowOffsetY = 0;

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

/**
 *       _
 *	  a	 |
 *       |  b
 * | --- X --- |
 *    d  |
 *       |c
 *       _
 */
class BoundingBox extends ECS.Component {
	active: boolean;
	centerX: number;
	centerY: number;

	a: number;
	b: number;
	c: number;
	d: number;
	padding: number;

	bottomCollision: boolean;
	leftCollision: boolean;
	rightCollision: boolean;
	topCollision: boolean;

	constructor(a: number, b: number, c: number, d: number, base: number = 0, active: boolean = false) {
		super();
		this.active = active;
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.padding = base;
		this.bottomCollision = false;
		this.topCollision = false;
		this.rightCollision = false;
		this.leftCollision = false;
	}

	set_center(x: number, y: number): void {
		this.centerX = x;
		this.centerY = y;
	}

	get minX() {
		return this.centerX - this.d;
	}

	get maxX() {
		return this.centerX + this.b;
	}

	get minY() {
		return this.centerY - this.a - this.padding;
	}
	get maxY() {
		return this.centerY + this.c + this.padding;
	}
}

class Weapons extends ECS.Component {}

class Primary extends ECS.Component {}

class Static extends ECS.Component {}

class Dynamic extends ECS.Component {}

class MovementDirection extends ECS.Component {
	right: boolean = true;
}

class Velocity extends Vector {}

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
	zFactor: number;
	constructor(image: HTMLImageElement, w: number, h: number, zFactor: number = 0) {
		super();
		this.image = image;
		this.width = w;
		this.height = h;
		this.zFactor = zFactor;
	}
}

class Sprite extends ECS.Component {
	image: HTMLImageElement;
	width: number;
	height: number;

	states: SpriteState[];
	state: SpriteState;
	time: number;

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
		let diffX = position.x - windowCenterX;
		let diffY = position.y - windowCenterY;

		//console.log({ diffY, y: position.y, windowOffsetY });

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

	constructor() {
		super([Input]);

		this.keys = {};

		window.addEventListener("keydown", (e) => {
			this.keys[e.code] = true;
		});

		window.addEventListener("keyup", (e) => {
			delete this.keys[e.code];
		});

		/*
		canvas.addEventListener("mousemove", function(e) { 
    	var cRect = canvas.getBoundingClientRect();        // Gets CSS pos, and width/height
    	var canvasX = Math.round(e.clientX - cRect.left) / 2;  // Subtract the 'left' of the canvas 
    	var canvasY = Math.round(e.clientY - cRect.top) / 2;   // from the X/Y positions to make  
			console.log({canvasX, canvasY})
		});
		*/
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		input.pressed = { ...this.keys };
	}
}

class MovementSystem extends ECS.System {
	constructor() {
		super([Input, Velocity, BoundingBox, Position, MovementDirection]);
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
		const direction = entity.getComponent(MovementDirection) as MovementDirection;

		velocity.x = 0;
		const speed = 100;

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
			//sprite.setState("jump")
			velocity.y = -150;
		}

		if (!(aabb.bottomCollision || position.y == params.canvas.height)) {
			sprite.setState(direction.right ? "jump-right" : "jump-left");
		}
	}
}

class WeaponSystem extends ECS.System {
	constructor() {
		super([Input, Position, Weapons, MovementDirection]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		const position = entity.getComponent(Position) as Position;
		const direction = entity.getComponent(MovementDirection) as MovementDirection;

		const dir = direction.right ? 1 : -1;

		if (input.is_pressed("Space", 200)) {
			const projectile = new ECS.Entity(1)
				.addComponent(new Position(position.x + 6, position.y - 5, false))
				.addComponent(new Velocity(300 * dir, -50))
				.addComponent(new Light(grenadeSprite, 9, 3))
				.addComponent(new BoundingBox(5, 5, 5, 5, 0, true))
				.addComponent(new Explosive());
			params.ecs.addEntity(projectile);
		}

		if (input.is_pressed("KeyF", 50)) {
			const projectile = new ECS.Entity(1)
				.addComponent(new Position(position.x + 6, position.y - 5, false))
				.addComponent(new Velocity(500 * dir, -10))
				.addComponent(new Light(bulletSprite, 3, 3))
				.addComponent(new BoundingBox(5, 5, 5, 5, 0, true))
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
		super([Position, Velocity, BoundingBox]); // necessary Components
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const velocity = entity.getComponent(Velocity) as Velocity;
		const position = entity.getComponent(Position) as Position;
		const aabb = entity.getComponent(BoundingBox) as BoundingBox;

		// debug

		position.x += params.dt * velocity.x;
		position.y += params.dt * velocity.y;

		if (position.y < params.canvas.height && !aabb.bottomCollision) {
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

class LightSystem extends ECS.System {
	constructor() {
		super([Light, Position]);

		this.updateCallback = (entities: ECS.Entity[]) => {

			return entities.sort((a: ECS.Entity, b: ECS.Entity) => {
				let al = a.getComponent(Light) as Light;
				let bl = b.getComponent(Light) as Light;
				return al.zFactor - bl.zFactor; 
			});
		}
	}


	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const sprite = entity.getComponent(Light) as Light;
		const coords = entity.getComponent(Position) as Position;
		params.context.drawImage(
			sprite.image,
			0,
			0,
			sprite.width,
			sprite.height,
			coords.x - Math.round(sprite.width / 2) - windowOffsetX,
			coords.y - Math.round(sprite.height / 2),
			sprite.width,
			sprite.height
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
		const direction = entity.getComponent(MovementDirection) as MovementDirection;

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
			coords.y - Math.round(sprite.height),
			sprite.width,
			sprite.height
		);
	}
}

class SpatialHashGrid {
	_grid: Map<string, ECS.Entity[]>;
	_lastPos: Map<string, number[]>;
	_gridsize: number;

	constructor(gridsize: number) {
		this._grid = new Map();
		this._lastPos = new Map();
		this._gridsize = gridsize;
	}

	hash(x: number, y: number): number[] {
		return [Math.floor(x / this._gridsize), Math.floor(y / this._gridsize)];
	}

	update(entity: ECS.Entity) {}

	remove(entity: ECS.Entity): void {
		if (!this._lastPos.has(entity.id)) return;

		let [minX, minY, maxX, maxY] = this._lastPos.get(entity.id);
		this._lastPos.delete(entity.id);

		for (let i = minX; i <= maxX; i++) {
			for (let j = minY; j <= maxY; j++) {
				const key = `${i}/${j}`;

				if (this._grid.has(key)) {
					let cell = this._grid.get(key);
					this._grid.set(
						key,
						cell.filter((item) => item != entity)
					);
				}
			}
		}
	}

	insert(entity: ECS.Entity): void {
		let box = entity.getComponent(BoundingBox) as BoundingBox;
		if (!box) new Error("Entity must have a bounding box");

		let [minX, minY] = this.hash(box.minX, box.minY);
		let [maxX, maxY] = this.hash(box.maxX, box.maxY);

		/*
		if (this._lastPos.has(entity.id)) {
			let [lastMinX, lastMinY, lastMaxX, lastMaxY] = this._lastPos.get(entity.id);
			if (minX == lastMinX && minY == lastMinY && maxX == lastMaxX && maxY == lastMaxY) {
				return;
			}
		}
		*/

		this._lastPos.set(entity.id, [minX, minY, maxX, maxY]);

		for (let i = minX; i <= maxX; i++) {
			for (let j = minY; j <= maxY; j++) {
				const key = `${i}/${j}`;

				if (this._grid.has(key)) {
					let list = this._grid.get(key);
					list.push(entity);
					this._grid.set(key, list);
				} else {
					this._grid.set(key, [entity]);
				}
			}
		}
	}

	possible_collisions(entity: ECS.Entity): ECS.Entity[] {
		let box = entity.getComponent(BoundingBox) as BoundingBox;
		if (!box) new Error("Entity must have a bounding box");

		let [minX, minY] = this.hash(box.minX, box.minY);
		let [maxX, maxY] = this.hash(box.maxX, box.maxY);

		let possible = new Set<ECS.Entity>();

		for (let i = minX; i <= maxX; i++) {
			for (let j = minY; j <= maxY; j++) {
				const key = `${i}/${j}`;

				if (this._grid.has(key)) {
					this._grid
						.get(key)
						.filter((item) => item != entity)
						.map((item) => possible.add(item));
				}
			}
		}

		return [...possible];
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
									position.y -= y - aabb.padding;
									velocity.y = Math.min(0, velocity.y);
									console.log("collision!", y, aabb.padding)
								} else if (aabb.padding == y) {
									console.log("touching", y, aabb.padding)
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

/**
 * Setup
 */

const ecs = new ECS.ECS();

ecs.addSystem(new InputSystem());
ecs.addSystem(new ScrollSystem());
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
player.addComponent(new MovementDirection());
player.addComponent(new Dynamic());
player.addComponent(new Primary());
player.addComponent(new Light(lightSprite, 512, 512, -1));
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

let boxes = [
	[16 * 4, 128],
	[16 * 6, 128],
	[16 * 8, 128 - 16 * 2],
	[16 * 9, 128 - 16 * 1],
	[16 * 10, 128 - 16 * 1],
	[16 * 11, 128 - 16 * 1],
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
	if (e.code == "KeyP"){
		paused = !paused;
	}
})


let dt: number = 0;
let then: number = 0;

/**
 * Game Loop
 */
function animate(now: number) {
	now *= 0.001;
	dt = now - then;
	then = now;


	if (!paused){
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = "rgb(0,0,0)";
		context.fillRect(0, 0, canvas.width, canvas.height);
		ecs.update({ dt, canvas, context, ecs });
	}
	requestAnimationFrame(animate);
}

animate(0);
