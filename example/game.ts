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

const boxSprite = new Image();
boxSprite.src = "assets/box.png";

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

	constructor(a: number, b: number, c: number, d: number, active: boolean = false) {
		super();
		this.active = active;
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
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
		return this.centerY - this.a;
	}
	get maxY() {
		return this.centerY + this.c;
	}
}

class Weapons extends ECS.Component {}

class Primary extends ECS.Component {}

class Static extends ECS.Component {}

class Dynamic extends ECS.Component {}

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
		frameX: number = 0,
		frameY: number = 0,
		maxFrameX: number = 1,
		maxFrameY: number = 1
	) {
		super();
		this.image = image;
		this.width = width;
		this.height = height;
		this.frameX = frameX;
		this.frameY = frameY;
		this.maxFrameX = maxFrameX;
		this.maxFrameY = maxFrameY;
		this.animate = false;
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
		super([Input, Position, Weapons]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		const position = entity.getComponent(Position) as Position;

		if (input.is_pressed("Space", 200)) {
			const projectile = new ECS.Entity(1);
			projectile.addComponent(new Position(position.x + 6, position.y - 5, false));
			projectile.addComponent(new Velocity(300, -50));
			projectile.addComponent(new Sprite(grenadeSprite, 9, 3, 0, 0, 1, 1));
			projectile.addComponent(new BoundingBox(2, 2, 2, 2, true));
			projectile.addComponent(new Explosive());
			params.ecs.addEntity(projectile);
		}

		if (input.is_pressed("KeyF", 50)) {
			const projectile = new ECS.Entity(1);
			projectile.addComponent(new Position(position.x + 6, position.y - 5, false));
			projectile.addComponent(new Velocity(500, -10));
			projectile.addComponent(new Sprite(bulletSprite, 9, 3, 0, 0, 1, 1));
			projectile.addComponent(new BoundingBox(2, 2, 2, 2, true));
			projectile.addComponent(new Explosive());
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

		if (this._lastPos.has(entity.id)) {
			let [lastMinX, lastMinY, lastMaxX, lastMaxY] = this._lastPos.get(entity.id);
			if (minX == lastMinX && minY == lastMinY && maxX == lastMaxX && maxY == lastMaxY) {
				return;
			}
		}

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
		let velocity = entity.getComponent(Position) as Velocity;

		if (position.changed) {
			this.sph.remove(entity);
			aabb.set_center(position.x, position.y);
			this.sph.insert(entity);
		}

		if (aabb.active) {
			for (const possible of this.sph.possible_collisions(entity)) {
				const possible_aabb = possible.getComponent(BoundingBox) as BoundingBox;

				let intersection = this._intersection(aabb, possible_aabb);
				if (intersection) {
					//console.log("intersection", entity.id, possible.id, intersection);

					if (entity.getComponent(Explosive) && possible.getComponent(Destructible)) {
						console.log("explosion");
						params.ecs.removeEntity(entity);
					}

					if (entity.getComponent(Dynamic) && possible.getComponent(Static)) {
						console.log("static intersection", intersection)
						let [x, y] = intersection;

						if (Math.abs(x) < Math.abs(y)) {
							position.x -= x;

						} else {
							position.y -= y;
						}
					}
				}
			}
		}
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
ecs.addSystem(new CollisionSystem());
ecs.addSystem(new PositionChangeSystem());

const player = new ECS.Entity();
player.addComponent(new Velocity(0, 0));
player.addComponent(new Input());
player.addComponent(new Weapons());
player.addComponent(new Dynamic());
player.addComponent(new Primary());
player.addComponent(new Position(windowCenter, canvas.height));
player.addComponent(new Sprite(characterSprite, 16, 16));
player.addComponent(new BoundingBox(16, 8, 0, 8, true));
ecs.addEntity(player);

for (let i = 0; i < 10; i++) {
	const tree = new ECS.Entity();
	tree.addComponent(new Position(i * 90, canvas.height));
	tree.addComponent(new Sprite(treeSprite, 16, 16));
	tree.addComponent(new BoundingBox(16, 8, 0, 8, false));
	ecs.addEntity(tree);
}

{
	const box = new ECS.Entity();
	box.addComponent(new Position(100, canvas.height));
	box.addComponent(new Sprite(boxSprite, 16, 16));
	box.addComponent(new BoundingBox(16, 8, 0, 8, false));
	box.addComponent(new Destructible());
	box.addComponent(new Static());
	ecs.addEntity(box);
}

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
