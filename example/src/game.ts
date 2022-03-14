import { classicNameResolver } from "typescript";
import * as ECS from "../../lib";

let canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
let context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

let on_mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

let windowOffsetX = 0;
let windowCenterX = canvas.width / 2;
const GROUND_LEVEL = canvas.height - (on_mobile ? 32 : 16);

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

const cthulluSprite = new Image();
cthulluSprite.src = "assets/cthullu.png";

class Vector {
	x: number;
	y: number;
	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	scalarMult(scalar: number): void {
		this.x *= scalar;
		this.y *= scalar;
	}

	add(vector: Vector): Vector {
		return new Vector(this.x + vector.x, this.y + vector.y);
	}

	sub(vector: Vector): Vector {
		return new Vector(this.x - vector.x, this.y - vector.y);
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

class Detectable extends ECS.Component {}

class Gun extends ECS.Component {
	firingRate: number = 0;
}

class Rifle extends Gun {
}

class GrenadeLauncher extends Gun {}

class Primary extends ECS.Component {}

class Static extends ECS.Component {}

class Dynamic extends ECS.Component {}

class Explosive extends ECS.Component {}

class Shootable extends ECS.Component {}

class Velocity extends ECS.Component {
	x: number;
	y: number;

	constructor(x, y) {
		super();
		this.x = x;
		this.y = y;
	}
}

class Direction extends ECS.Component {
	right: boolean = true;
}

class Position extends ECS.Component {
	_x: number;
	_y: number;
	_lastX: number;
	_lastY: number;
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
		return Math.round(this._x);
	}

	get y() {
		return Math.round(this._y);
	}

	get vector(): Vector {
		return new Vector(this._x, this._y);
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

class SpriteState extends ECS.State {
	frameX: number;
	frameY: number;
	frames: number;
	duration: number;
	timeLeft: number;

	constructor(name: string, row: number, frames: number, duration: number = -1) {
		super(name);
		//this.name = name;
		this.frameX = 0;
		this.frameY = row;
		this.frames = frames;
		this.duration = duration;
		this.timeLeft = 0;
	}

	enter(): void {
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

	states: Map<string, SpriteState>;
	state: SpriteState;
	time: number;
	flushBottom: boolean = true;

	constructor(image: HTMLImageElement, width: number, height: number, states: SpriteState[] = []) {
		super();
		this.image = image;
		this.width = width;
		this.height = height;
		this.time = 0;
		this.states = new Map();

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
		this.states.set(state.name, state);
	}

	setState(name: string) {
		this.state?.exit();
		this.state = this.states.get(name);
		this.state?.enter();
	}
}

class Input extends ECS.Component {
	leftRight: number = 0;
	jump: boolean = false;
	shoot: boolean = false;
	grenade: boolean = false;
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
	/*
	mouseX: number;
	mouseY: number;
	leftMousedown: boolean = false;
	rightMousedown: boolean = false;
	*/

	leftRight: number = 0;
	jump: boolean = false;
	shoot: boolean = false;

	constructor() {
		super([Input]);

		this.keys = {};

		window.addEventListener("keydown", (e) => {
			this.keys[e.code] = true;

			switch (e.code) {
				case "KeyA":
					this.leftRight = -1;
					break;
				case "KeyD":
					this.leftRight = 1;
					break;
				case "KeyW":
					this.jump = true;
					break;
				case "Space":
					this.shoot = true;
					break;
			}
		});

		window.addEventListener("keyup", (e) => {
			delete this.keys[e.code];
			switch (e.code) {
				case "KeyA":
					this.leftRight = Math.max(this.leftRight, 0);
					break;
				case "KeyD":
					this.leftRight = Math.min(this.leftRight, 0);
					break;
				case "KeyW":
					this.jump = false;
					break;
				case "Space":
					this.shoot = false;
					break;
			}
		});
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		input.jump = this.jump;
		input.shoot = this.shoot;
		input.leftRight = this.leftRight;
	}
}

class MobileInputSystem extends ECS.System {
	leftRight: number = 0;
	topDown: number = 0;
	jump: boolean = false;
	shoot: boolean = false;
	grenade: boolean = false;

	constructor() {
		super([Input]);


		let left_control = document.querySelector("#left-control") as HTMLElement;
		left_control.style.display = "flex";

		let left_debug = document.querySelector("#left-debug") as HTMLElement;
		let bbox = left_control.getBoundingClientRect();

		const handleTouch = (e: TouchEvent) => {
			let touch = e.touches[0];
			let x = touch.clientX - bbox.left;
			let width = left_control.offsetWidth;
			this.leftRight = x < width / 2 ? -1 :1;
			//left_debug.innerText = `${this.leftRight}, x=${x}, width=${width}`;
		}

		left_control.addEventListener("touchstart",handleTouch );
		left_control.addEventListener("touchmove",handleTouch );
		left_control.addEventListener("touchend", () =>{
			this.leftRight = 0;
		} );

		const right_control = document.querySelector("#right-control") as HTMLElement;
		right_control.style.display = "flex";
		right_control.addEventListener("touchstart", (e) => {
			this.jump = true;
		});
		right_control.addEventListener("touchend", (e) => {
			this.jump = false;
		});

		const button_1 = document.querySelector('#button-1')  as HTMLElement
		button_1.style.display = "flex";
		button_1.addEventListener("touchstart", () => {
			this.shoot = true;
		})
		button_1.addEventListener("touchend", () => {
			this.shoot = false;
		})

		const button_2 = document.querySelector('#button-2')  as HTMLElement
		button_2.style.display = "flex";
		button_2.addEventListener("touchstart", () => {
			this.grenade = true;
		})
		button_2.addEventListener("touchend", () => {
			this.grenade = false;
		})
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		input.jump = this.jump;
		input.shoot = this.shoot;
		input.grenade = this.grenade;
		input.leftRight = this.leftRight;
	}
}

class MovementSystem extends ECS.System {
	constructor() {
		super([Input, Velocity, Position, Collider, Direction, Sprite]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		const velocity = entity.getComponent(Velocity) as Velocity;
		const aabb = entity.getComponent(Collider) as Collider;
		const position = entity.getComponent(Position) as Position;
		const direction = entity.getComponent(Direction) as Direction;
		const sprite = entity.getComponent(Sprite) as Sprite;

		const speed = 50;
		velocity.x = speed * input.leftRight;

		if (input.jump && (aabb.bottomCollision || position.y == GROUND_LEVEL) && !aabb.topCollision) {
			velocity.y = -200;
		}

		sprite.setState(direction.right ? "idle-right" : "idle-left");

		if (Math.abs(input.leftRight) > 0) {
			direction.right = input.leftRight >= 0;
			sprite.setState(direction.right ? "run-right" : "run-left");
		}

		if (!(aabb.bottomCollision || position.y == GROUND_LEVEL)) {
			sprite.setState(direction.right ? "jump-right" : "jump-left");
		}
	}
}

class WeaponSystem extends ECS.System {
	constructor() {
		super([Input, Position, Rifle, Direction, GrenadeLauncher]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		const rifle = entity.getComponent(Rifle) as Rifle;
		const grenade = entity.getComponent(GrenadeLauncher) as GrenadeLauncher;
		const position = entity.getComponent(Position) as Position;
		const direction = entity.getComponent(Direction) as Direction;

		let gunPosOffset = 8;
		const vector = new Vector(direction.right ? 1 : -1, 0);

		if ((grenade.firingRate -= params.dt) < 0 && input.grenade) {
			grenade.firingRate = 0.5;

			vector.scalarMult(300);
			let sprite = new Sprite(bulletSprite, 4, 4);
			sprite.flushBottom = false;

			const projectile = new ECS.Entity(2)
				.addComponent(new Position(position.x, position.y - gunPosOffset, false))
				.addComponent(new Velocity(vector.x, vector.y))
				.addComponent(new Light(lightSprite2, 128, 128))
				.addComponent(sprite);
			params.ecs.addEntity(projectile);
		}

		if ((rifle.firingRate -= params.dt) < 0 && input.shoot) {
			rifle.firingRate = 0.1;

			vector.scalarMult(700);
			const projectile = new ECS.Entity(1)
				.addComponent(new Position(position.x, position.y - gunPosOffset, false))
				.addComponent(new Velocity(vector.x, vector.y))
				.addComponent(new Sprite(pixelSprite, 1, 1))
				.addComponent(new Light(smallLight, 16, 16))
				.addComponent(new Collider(1, 1, 1, 1, 0, true))
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
		super([Position, Velocity]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const velocity = entity.getComponent(Velocity) as Velocity;
		const position = entity.getComponent(Position) as Position;
		const aabb = entity.getComponent(Collider) as Collider; // optional

		let dt = params.dt;

		position._lastX = position.x;
		position._lastY = position.y;

		position.x += dt * velocity.x;
		position.y += dt * velocity.y;

		if (position.y < GROUND_LEVEL && (!aabb || !aabb.bottomCollision)) {
			velocity.y += dt * 500;
		}

		if (position.clamp) {
			if (position.y > GROUND_LEVEL) {
				position.y = GROUND_LEVEL;
				velocity.y = 0;
			}
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
			if (sprite.time > 0.1) {
				sprite.time = 0;
				sprite.state.frameX = (sprite.state.frameX + 1) % sprite.state.frames;
			}
		}

		if (sprite.state.duration != -1) {
			sprite.state.timeLeft += params.dt;
			if (sprite.state.timeLeft > sprite.state.duration) {
				sprite.state.timeLeft = 0;
				sprite.setState(sprite.state.previous.name);
				/*
				if (direction) {
					sprite.setState(direction.right ? "idle-right" : "idle-left");
				} else {
					sprite.setState("idle");
				}
				*/
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

class Collider extends ECS.Component {
	active: boolean;
	centerX: number;
	centerY: number;

	top: number;
	right: number;
	bottom: number;
	left: number;
	padding: number;

	bottomCollision: boolean;
	leftCollision: boolean;
	rightCollision: boolean;
	topCollision: boolean;

	constructor(
		top: number,
		right: number,
		bottom: number,
		left: number,
		padding: number = 0,
		active: boolean = false
	) {
		super();
		this.active = active;
		this.top = top;
		this.right = right;
		this.bottom = bottom;
		this.left = left;
		this.padding = padding;
		this.bottomCollision = false;
		this.topCollision = false;
		this.rightCollision = false;
		this.leftCollision = false;
	}
}

class AABB {
	position: Position;
	collider: Collider;
	constructor(collider: Collider, position: Position) {
		this.position = position;
		this.collider = collider;
	}

	get minX() {
		return this.position.x - this.collider.left;
	}

	get maxX() {
		return this.position.x + this.collider.right;
	}

	get minY() {
		return this.position.y - this.collider.top - this.collider.padding;
	}

	get maxY() {
		return this.position.y + this.collider.bottom + this.collider.padding;
	}
}

class DetectionRadius extends Collider {
	detected: ECS.Entity[];

	constructor(range: number) {
		super(range, range, range, range);
	}
}

class SpatialHashGrid {
	_gridsize: number;
	_lastPos: Map<string, number[]>;
	_grid: Map<string, ECS.Entity[]>;

	constructor(gridsize: number) {
		this._grid = new Map();
		this._lastPos = new Map();
		this._gridsize = gridsize;
	}

	static check_collision(a: AABB, b: AABB): number[] | null {
		if (a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY) {
			let d0: number, d1: number;
			d0 = a.maxX - b.minX;
			d1 = b.maxX - a.minX;
			let x = d0 < d1 ? d0 : -d1;
			d0 = a.maxY - b.minY;
			d1 = b.maxY - a.minY;
			let y = d0 < d1 ? d0 : -d1;
			return [x, y];
		} else {
			return null;
		}
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

	insert(entity: ECS.Entity, aabb: AABB): void {
		const [minX, minY] = this.hash(aabb.minX, aabb.minY);
		const [maxX, maxY] = this.hash(aabb.maxX, aabb.maxY);

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

	possible_collisions(entity: ECS.Entity, aabb: AABB): ECS.Entity[] {
		const [minX, minY] = this.hash(aabb.minX, aabb.minY);
		const [maxX, maxY] = this.hash(aabb.maxX, aabb.maxY);

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

class DetectionSystem extends ECS.System {
	sph: SpatialHashGrid;

	constructor(sph: SpatialHashGrid) {
		super([Position, DetectionRadius]);
		this.sph = sph;
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		let position = entity.getComponent(Position) as Position;
		let detection = entity.getComponent(DetectionRadius) as DetectionRadius;

		let aabb = new AABB(detection, position);
		detection.detected = [];

		for (const other_entity of this.sph.possible_collisions(entity, aabb)) {
			let p = other_entity.getComponent(Position) as Position;
			let c = other_entity.getComponent(Collider) as Collider;
			let other_aabb = new AABB(c, p);

			if (SpatialHashGrid.check_collision(aabb, other_aabb)) {
				if (other_entity.getComponent(Detectable)) {
					detection.detected.push(other_entity);
				}
			}
		}
	}
}

class CollisionSystem extends ECS.System {
	sph: SpatialHashGrid;

	constructor(sph: SpatialHashGrid) {
		super([Position, Collider]);
		this.sph = sph;
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		let collider = entity.getComponent(Collider) as Collider;
		let position = entity.getComponent(Position) as Position;
		let velocity = entity.getComponent(Velocity) as Velocity;
		let aabb = new AABB(collider, position);

		if (position.changed) {
			this.sph.remove(entity);
			this.sph.insert(entity, aabb);
		}

		collider.topCollision = false;
		collider.bottomCollision = false;

		if (collider.active) {
			for (const possible of this.sph.possible_collisions(entity, aabb)) {
				const possible_col = possible.getComponent(Collider) as Collider;
				const possible_pos = possible.getComponent(Position) as Position;

				let possible_aabb = new AABB(possible_col, possible_pos);

				let depth = SpatialHashGrid.check_collision(aabb, possible_aabb);
				if (depth) {
					if (entity.getComponent(Explosive) && possible.getComponent(Shootable)) {
						// console.log("collision", entity.id, possible.id)
						params.ecs.removeEntity(entity);
					}

					if (entity.getComponent(Dynamic) && possible.getComponent(Static)) {
						const [x, y] = depth;

						if (Math.abs(x) < Math.abs(y) - collider.padding * 2) {
							position.x -= x;
						} else {
							if (y > 0) {
								if (y > collider.padding) {
									velocity.y = Math.min(0, velocity.y);
									position.y -= y - collider.padding;
								} else if (collider.padding == y) {
									velocity.y = Math.min(0, velocity.y);
									collider.bottomCollision = true;
								}
							} else if (y < 0) {
								if (Math.abs(y) > collider.padding) {
									position.y -= y + collider.padding;
									velocity.y = Math.max(0, velocity.y);
								} else {
									collider.topCollision = true;
								}
							}
						}
					}
				}
			}
		}
	}
}

class Ai extends ECS.Component {
	time: number = 0;
}

class AiSystem extends ECS.System {
	constructor() {
		super([Ai, DetectionRadius, Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = (entity.getComponent(Position) as Position).vector;
		const detection = entity.getComponent(DetectionRadius) as DetectionRadius;
		const ai = entity.getComponent(Ai) as Ai;

		for (const detected_entity of detection.detected) {
			if (detected_entity.getComponent(Primary)) {
				const target_position = (detected_entity.getComponent(Position) as Position).vector;

				const offset = 8;
				position.y -= offset;
				target_position.y -= offset;
				const dir = target_position.sub(position);
				dir.normalize();

				dir.scalarMult(500);

				ai.time += params.dt;
				if (ai.time > 0.3) {
					const projectile = new ECS.Entity(1)
						.addComponent(new Position(position.x, position.y, false))
						.addComponent(new Velocity(dir.x, dir.y))
						.addComponent(new Sprite(pixelSprite, 1, 1))
						.addComponent(new Light(smallLight, 16, 16))
						.addComponent(new Collider(1, 1, 1, 1, 0, true))
						.addComponent(new Explosive());
					params.ecs.addEntity(projectile);
					ai.time = 0;
				}
			}
		}
	}
}

const sph = new SpatialHashGrid(16);
const gameState = new ECS.FiniteStateMachine();
gameState.addState(new ECS.State("pause"));
gameState.addState(new ECS.State("play"));
gameState.addState(new ECS.State("dead"));
gameState.addState(new ECS.State("title"));
gameState.setState("play");

const ecs = new ECS.ECS();
ecs.addSystem(on_mobile ? new MobileInputSystem() : new InputSystem());
ecs.addSystem(new CameraSystem());
ecs.addSystem(new PhysicsSystem());
ecs.addSystem(new CollisionSystem(sph));
ecs.addSystem(new DetectionSystem(sph));
ecs.addSystem(new AiSystem());
ecs.addSystem(new MovementSystem());
ecs.addSystem(new WeaponSystem());
ecs.addSystem(new SpriteSystem());
ecs.addSystem(new LightSystem());
ecs.addSystem(new PositionChangeSystem());

const player = new ECS.Entity();
player.addComponent(new Velocity(0, 0));
player.addComponent(new Rifle());
player.addComponent(new GrenadeLauncher());
player.addComponent(new Direction());
player.addComponent(new Dynamic());
player.addComponent(new Primary());
player.addComponent(new Input());
player.addComponent(new Light(lightSprite, 128, 128, 12));
player.addComponent(new Position(windowCenterX, GROUND_LEVEL));
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
player.addComponent(new Collider(16, 5, 0, 5, 3, true));
player.addComponent(new Detectable());
ecs.addEntity(player);

/*
{
	ecs.addEntity(
		new ECS.Entity()
			.addComponent(new Position(16 * 12, GROUND_LEVEL))
			.addComponent(new DetectionRadius(50))
			//.addComponent(new Shootable())
			.addComponent(new Ai())
			.addComponent(new Collider(16, 8, 0, 8, 0, false))
			.addComponent(new Sprite(cthulluSprite, 16, 16, [new SpriteState("idle", 0, 4)]))
	);
}
*/

{
	let sprite = new Sprite(bulletSprite, 4, 4);
	sprite.flushBottom = false;
	ecs.addEntity(
		new ECS.Entity()
			.addComponent(new Position(16 * 6, GROUND_LEVEL - 16 * 2 - 8))
			.addComponent(new Light(lightSprite2, 128, 128))
			.addComponent(sprite)
	);
}

let boxes = [
	[16 * 4, GROUND_LEVEL],
	[16 * 6, GROUND_LEVEL - 16 * 1],
	[16 * 8, GROUND_LEVEL - 16 * 2],
	[16 * 10, GROUND_LEVEL - 16 * 1],
	[16 * 13, GROUND_LEVEL - 16 * 2],
	[16 * 10, GROUND_LEVEL - 16 * 4],
	[16 * 14, GROUND_LEVEL - 16 * 2],
];

for (let [x, y] of boxes) {
	const box = new ECS.Entity()
		.addComponent(new Position(x, y))
		.addComponent(new Sprite(boxSprite, 16, 16))
		.addComponent(new Collider(16, 8, 0, 8, 0, false))
		.addComponent(new Shootable())
		.addComponent(new Static());
	ecs.addEntity(box);
}

let paused = false;
document.addEventListener("keydown", (e) => {
	if (e.code == "KeyP") {
		paused = !paused;
		if (gameState.current.name == "pause") {
			gameState.setState(gameState.current.previous.name);
		} else {
			gameState.setState("pause");
		}
	}
});

document.addEventListener(
	"touchstart",
	(e) => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().then(() => {
				console.log("set full screen");
				screen.orientation.lock("landscape");
				//gameState.setState("play")
			});
		}
	},
	false
);

const fps_display = document.querySelector("#fps") as HTMLElement;
let tmp = 0;

let dt: number = 0;
let then: number = 0;

/**
 * Game Loop
 */
function animate(now: number) {
	(now *= 0.001), (dt = now - then), (then = now);

	if ((tmp += dt) > 1) {
		tmp = 0;
		fps_display.innerText = `${(1 / dt).toFixed(2)} fps`;
	}

	if (gameState.current.name === "play") {
		{
			// clear screen
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.fillStyle = "rgb(0,0,0)";
			context.fillRect(0, 0, canvas.width, canvas.height);
		}
		{
			// draw ground level line
			context.beginPath();
			context.moveTo(0, GROUND_LEVEL + 0.5);
			context.lineTo(canvas.width, GROUND_LEVEL + 0.5);
			context.strokeStyle = "#fff";
			context.lineWidth = 1;
			context.stroke();
			context.closePath();
		}
		{
			// update game
			ecs.update({ dt, canvas: canvas, context: context, ecs });
		}
	}
	requestAnimationFrame(animate);
}

animate(0);
