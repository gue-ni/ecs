import { AssertsIdentifierTypePredicate } from "typescript";
import * as ECS from "../../lib";
import { randomInteger, randomFloat } from "./util";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
const player = new ECS.Entity();

const ON_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

let WINDOW_OFFSET_X = 0;
let WINDOW_OFFSET_Y = 0;
let WINDOW_CENTER_X = canvas.width / 2;

const GRAVITY = 500;
const BOTTOM_BORDER = ON_MOBILE ? 40 : 30;
const GROUND_LEVEL = canvas.height - BOTTOM_BORDER;

const gameState = new ECS.FiniteStateMachine();
gameState.addState(new ECS.HTMLState("pause", "#paused"));
gameState.addState(new ECS.HTMLState("play", "#hud"));
gameState.addState(new ECS.HTMLState("dead", "#dead"));
gameState.addState(new ECS.HTMLState("title", "#title"));
gameState.addState(new ECS.HTMLState("orientation", "#orientation"));
gameState.setState("title");

const CHARACTER_SPRITE = new Image();
CHARACTER_SPRITE.src = "assets/sprites.png";

const VILLAIN_SPRITE = new Image();
VILLAIN_SPRITE.src = "assets/bones.png";

const spikes = new Image();
spikes.src = "assets/bottom_spikes.png";

const BIG_LIGHT_SPRITE = new Image();
BIG_LIGHT_SPRITE.src = "assets/light.png";

const COIN_SPRITE = new Image();
COIN_SPRITE.src = "assets/coin.png";

const BRIGHT_LIGHT_SPRITE = new Image();
BRIGHT_LIGHT_SPRITE.src = "assets/light2.png";

const bulletSprite = new Image();
bulletSprite.src = "assets/bullet.png";

const TILE_SPRITE = new Image();
TILE_SPRITE.src = "assets/tiles.png";

const CHARACTER_LIGHT = new Image();
CHARACTER_LIGHT.src = "assets/characterlight.png";

const ONE_PIXEL = new Image();
ONE_PIXEL.src = "assets/pixel.png";

const SMALL_LIGHT_SPRITE = new Image();
SMALL_LIGHT_SPRITE.src = "assets/small-light.png";

const cthulluSprite = new Image();
cthulluSprite.src = "assets/cthullu.png";

class Vector {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	scalarMult(scalar: number): Vector {
		this.x *= scalar;
		this.y *= scalar;
		return this;
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

	round(): Vector {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	}

	normalize(): Vector {
		let mag = this.magnitude();
		this.x /= mag;
		this.y /= mag;
		return this;
	}
}

class Detectable extends ECS.Component {}

class Spikes extends ECS.Component {}

class Speed extends ECS.Component {
	value: number;
	constructor(value: number = 50) {
		super();
		this.value = value;
	}
}

class Player extends ECS.Component {}

class Collectible extends ECS.Component {
	type: string;
	constructor(type: string = "default") {
		super();
		this.type = type;
	}
}

class Static extends ECS.Component {}

class Gravity extends ECS.Component {}

class Dynamic extends ECS.Component {}

class Damage extends ECS.Component {
	value: number;
	dealtBy: ECS.Entity;
	constructor(dealtBy: ECS.Entity, damage: number = 10) {
		super();
		this.value = damage;
		this.dealtBy = dealtBy;
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

interface SpriteParams {
	frameX?: number;
	frameY: number;
	frames?: number;
	playOnce?: boolean;
}

class SpriteState extends ECS.State {
	frameX: number;
	frameY: number;
	frames: number;
	playOnce: boolean;

	constructor(name: string, params: SpriteParams) {
		super(name);
		this.frameX = params.frameX || 0;
		this.frameY = params.frameY;
		this.frames = params.frames || 1;
		this.playOnce = params.playOnce || false;
	}

	enter(): void {
		if (this.playOnce) this.frameX = 0;
		//console.log("enter", this.name)
	}

	exit(): void {
		//console.log("exit", this.name)
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
			this.state = new SpriteState("idle", { frameY: 0 });
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
		if (name == this.state?.name) return;
		const previous = this.state;
		previous?.exit();
		const state = this.states.get(name);
		if (!state) return;

		this.state = state;
		this.state.previous = previous;
		this.state.enter();
	}

	setPreviousState() {
		let current = this.state;
		if (!current) throw new Error("No current state!");
		let previous = current.previous;
		if (!previous) throw new Error("No previous state!");
		this.setState(previous.name);
	}
}

class Input extends ECS.Component {
	leftRight: number = 0;
	doubleJumpAllowed: boolean = false;
	timeBetweenJumps: number = 0;

	pressed: any;
	last_pressed: any;

	mouse: any;
	mouse_last_pressed: any;

	mouseY: number;
	mouseX: number;

	constructor() {
		super();
		this.pressed = {};
		this.last_pressed = {};

		this.mouse = {};
		this.mouse_last_pressed = {};
	}

	is_key_pressed(key: string, delay?: number): boolean {
		if (this.pressed[key]) {
			if (!delay || !this.last_pressed[key] || Date.now() - this.last_pressed[key] > delay) {
				this.last_pressed[key] = Date.now();
				return true;
			}
		}
		return false;
	}

	is_mouse_pressed(side: string, delay?: number): boolean {
		if (this.mouse[side]) {
			if (!delay || !this.mouse_last_pressed[side] || Date.now() - this.mouse_last_pressed[side] > delay) {
				this.mouse_last_pressed[side] = Date.now();
				return true;
			}
		} else {
			return false;
		}
	}
}

class Inventory extends ECS.Component {
	inventory: Map<string, number>;
	constructor() {
		super();
		this.inventory = new Map();
	}

	increment(type: string) {
		let num = this.inventory.get(type) || 0;
		this.inventory.set(type, num + 1);
	}
}

class Health extends ECS.Component {
	value: number = 100;
	constructor() {
		super();
	}
}

class HealthSystem extends ECS.System {
	healthDisplay: HTMLElement;
	constructor() {
		super([Health], { updatesPerSecond: 2 });
		this.healthDisplay = document.querySelector("#health");
		this.healthDisplay.style.display = "flex";
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const health = entity.getComponent(Health) as Health;

		if (entity.getComponent(Player)) {
			this.healthDisplay.innerText = `Health: ${health.value}`;
		}

		if (health.value <= 0) {
			if (entity.getComponent(Player)) {
				console.log("you died!");
				gameState.setState("dead");
			} else {
				console.log("removing entity", health.value)
				params.ecs.removeEntity(entity);
			}
		}
	}
}

class CameraSystem extends ECS.System {
	constructor() {
		super([Player, Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = entity.getComponent(Position) as Position;

		const maxDiffX = 40;
		const maxDiffY = 80;
		const minDiffY = BOTTOM_BORDER;
		let diffX = position.x - WINDOW_CENTER_X;

		let diffY = canvas.height - WINDOW_OFFSET_Y - position.y;

		let delta = 0;
		if (diffY > maxDiffY) {
			delta = diffY - maxDiffY;
			WINDOW_OFFSET_Y += delta;
		} else if (diffY < minDiffY) {
			delta = diffY - minDiffY;
			WINDOW_OFFSET_Y += delta;
		}

		if (diffX > maxDiffX) {
			let delta = diffX - maxDiffX;
			WINDOW_OFFSET_X += delta;
			WINDOW_CENTER_X += delta;
		}

		if (diffX < -maxDiffX) {
			let delta = maxDiffX + diffX;
			WINDOW_CENTER_X += delta;
			WINDOW_OFFSET_X += delta;
		}
	}
}

class InputSystem extends ECS.System {
	keys: any;
	mouse: any;

	mouseX: number;
	mouseY: number;

	constructor() {
		super([Input, Player]);

		this.keys = {};
		this.mouse = {};

		window.addEventListener("keydown", (e) => {
			this.keys[e.code] = true;
		});

		window.addEventListener("keyup", (e) => {
			delete this.keys[e.code];
		});

		canvas.addEventListener("mousedown", (e) => {
			if (e.button == 0) {
				this.mouse["left"] = true;
			} else if (e.button == 2) {
				this.mouse["right"] = true;
			}
		});

		canvas.addEventListener("mouseup", (e) => {
			if (e.button == 0) {
				this.mouse["left"] = false;
			} else if (e.button == 2) {
				this.mouse["right"] = false;
			}
		});

		canvas.addEventListener("contextmenu", (e) => e.preventDefault());

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
		input.mouse = { ...this.mouse };

		input.mouseX = this.mouseX;
		input.mouseY = this.mouseY;
	}
}

/*
class MobileInputSystem extends ECS.System {
	leftRight: number = 0;
	topDown: number = 0;
	jump: boolean = false;
	shoot: boolean = false;
	grenade: boolean = false;

	constructor() {
		super([Input]);
		console.log("mobile");

		let left_control = document.querySelector("#left-control") as HTMLElement;
		left_control.style.display = "flex";

		let bbox = left_control.getBoundingClientRect();

		const handleTouch = (e: TouchEvent) => {
			let touch = e.touches[0];
			let x = touch.clientX - bbox.left;
			let width = left_control.offsetWidth;
			this.leftRight = 0;
			let tolerance = width * 0.1;
			if (x < width / 2 - tolerance){
				this.leftRight = -1;
			} else if (x > width / 2 + tolerance){
				this.leftRight = 1;
			}
			//this.leftRight = x < width / 2 ? -1 : 1;
			//left_debug.innerText = `${this.leftRight}, x=${x}, width=${width}`;
		};

		const handleTouch2 = (e: TouchEvent)=> {
			let touch = e.changedTouches[0];
			let x = touch.clientX - bbox.left;
			let width = left_control.offsetWidth;
			let h = width / 2;
			let val = (x - h) / h
			val *= 3;
			//let sigmoid = 1 / (1 + Math.exp(-val)) * Math.sign(val);
			this.leftRight = Math.min(Math.max(val, -1.0), 1.0);
		}

		left_control.addEventListener("touchstart", handleTouch);
		left_control.addEventListener("touchmove", handleTouch);
		left_control.addEventListener("touchend", () => {
			this.leftRight = 0;
		});

		const right_control = document.querySelector("#right-control") as HTMLElement;
		right_control.style.display = "flex";
		right_control.addEventListener("touchstart", (e) => {
			this.jump = true;
		});
		right_control.addEventListener("touchend", (e) => {
			this.jump = false;
		});

		const button_1 = document.querySelector("#button-1") as HTMLElement;
		button_1.style.display = "flex";
		button_1.addEventListener("touchstart", () => {
			this.shoot = true;
		});
		button_1.addEventListener("touchend", () => {
			this.shoot = false;
		});

		const button_2 = document.querySelector("#button-2") as HTMLElement;
		button_2.style.display = "flex";
		button_2.addEventListener("touchstart", () => {
			this.grenade = true;
		});
		button_2.addEventListener("touchend", () => {
			this.grenade = false;
		});
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		input.jump = this.jump;
		input.shoot = this.shoot;
		input.grenade = this.grenade;
		input.leftRight = this.leftRight;
	}
}
*/

class MovementSystem extends ECS.System {
	constructor() {
		super([Input, Velocity, Position, Collider, Direction, Sprite, Speed]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		const aabb = entity.getComponent(Collider) as Collider;
		const velocity = entity.getComponent(Velocity) as Velocity;
		const position = entity.getComponent(Position) as Position;
		const direction = entity.getComponent(Direction) as Direction;
		const sprite = entity.getComponent(Sprite) as Sprite;
		const speed = entity.getComponent(Speed) as Speed;
		const emitter = entity.getComponent(ParticleEmitter) as ParticleEmitter;

		const speedVal = speed.value;
		const jump_speed = -150;

		if (input.is_key_pressed("KeyA")) {
			input.leftRight = -1;
		} else if (input.is_key_pressed("KeyD")) {
			input.leftRight = 1;
		} else {
			input.leftRight = 0;
		}

		velocity.x = speedVal * input.leftRight;

		if (entity.getComponent(Player)) {
			direction.right = input.mouseX - (position.x - WINDOW_OFFSET_X) > 0;
		}

		const standing = aabb.bottomCollision || position.y == GROUND_LEVEL;

		input.timeBetweenJumps += params.dt;
		if (
			input.is_key_pressed("KeyW") &&
			(standing || (input.doubleJumpAllowed && !standing && input.timeBetweenJumps > 0.3)) &&
			!aabb.topCollision
		) {
			input.timeBetweenJumps = 0;
			input.doubleJumpAllowed = standing;
			velocity.y = jump_speed;
		}

		if (sprite.state.playOnce) {
			return;
		}

		sprite.setState(direction.right ? "idle-right" : "idle-left");
		if (emitter) emitter.emit = false;

		if (Math.abs(input.leftRight) > 0) {
			sprite.setState(direction.right ? "run-right" : "run-left");
		}

		if (!standing) {
			sprite.setState(direction.right ? "jump-right" : "jump-left");
			if (emitter) emitter.emit = true;
		}
	}
}

class CombatSystem extends ECS.System {
	constructor() {
		super([Input, Position, Direction, Sprite]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		const sprite = entity.getComponent(Sprite) as Sprite;
		const position = entity.getComponent(Position) as Position;
		const direction = entity.getComponent(Direction) as Direction;

		let gunPosOffset = 10;
		let mouseDir = new Vector(
			input.mouseX - (position.x - WINDOW_OFFSET_X),
			input.mouseY - (position.y + WINDOW_OFFSET_Y - gunPosOffset)
		);
		mouseDir.normalize();

		if (input.is_key_pressed("KeyF", 500)) {
			// TODO
			//console.log("melee");
			sprite.setState(direction.right ? "melee-right" : "melee-left");
		}

		let explosion = {
			minTTL: 0.2,
			maxTTL: 0.3,
			minSize: 1,
			maxSize: 2,
			maxCount: 7,
			alpha: 1.0,
			gravity: GRAVITY,
			speed: 25,
			positionSpread: 5,
			explosive: true,
		};

		if (input.is_mouse_pressed("right", 500)) {
			mouseDir.scalarMult(300);

			let sprite = new Sprite(bulletSprite, 4, 4);
			sprite.flushBottom = false;

			const projectile = new ECS.Entity(2)
				.addComponent(new Position(position.x, position.y - gunPosOffset, false))
				.addComponent(new Velocity(mouseDir.x, mouseDir.y))
				.addComponent(new Gravity())
				.addComponent(new Light(BRIGHT_LIGHT_SPRITE, 128, 128))
				.addComponent(sprite)
				.addComponent(new Collider(1, 1, 1, 1, 0, true))
				.addComponent(new ParticleEmitter(explosion))
				.addComponent(new Damage(entity));
			params.ecs.addEntity(projectile);
		}

		if (input.is_mouse_pressed("left", 100)) {
			mouseDir.scalarMult(400);
			const projectile = new ECS.Entity(1)
				.addComponent(new Position(position.x, position.y - gunPosOffset, false))
				.addComponent(new Velocity(mouseDir.x, mouseDir.y))
				.addComponent(new Sprite(ONE_PIXEL, 2, 2))
				.addComponent(new Light(SMALL_LIGHT_SPRITE, 16, 16))
				.addComponent(new Collider(1, 1, 1, 1, 0, true))
				.addComponent(new Damage(entity))
				.addComponent(new ParticleEmitter(explosion));

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

		if (position.y < GROUND_LEVEL && (!aabb || !aabb.bottomCollision) && entity.getComponent(Gravity)) {
			velocity.y += dt * GRAVITY;
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
			this.context.fillStyle = "rgba(0, 0, 0, 0.85)";
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
			coords.x - Math.round(light.width / 2) - WINDOW_OFFSET_X,
			coords.y - Math.round(light.height / 2) - light.yOffset + WINDOW_OFFSET_Y,
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

		if (sprite.state.playOnce && sprite.state.frameX == sprite.state.frames - 1) {
			sprite.setPreviousState();
		}

		const FRAME_RATE = 0.1;

		if (sprite.state.frames > 1) {
			sprite.time += params.dt;
			if (sprite.time > FRAME_RATE) {
				sprite.time = 0;
				sprite.state.frameX = (sprite.state.frameX + 1) % sprite.state.frames;
			}
		}

		params.context.drawImage(
			sprite.image,
			sprite.state.frameX * sprite.width,
			sprite.state.frameY * sprite.height,
			sprite.width,
			sprite.height,
			coords.x - Math.round(sprite.width / 2) - WINDOW_OFFSET_X,
			coords.y -
				(sprite.flushBottom ? Math.round(sprite.height) : Math.round(sprite.height / 2)) +
				WINDOW_OFFSET_Y,
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

	topCollision: boolean;
	leftCollision: boolean;
	rightCollision: boolean;
	bottomCollision: boolean;

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

	destroy(): void {
		sph.remove(this.entity);
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
		//console.log("removed", entity.id)
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
		let health = entity.getComponent(Health) as Health;
		let damage = entity.getComponent(Damage) as Damage;
		let inventory = entity.getComponent(Inventory) as Inventory;

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
				const possible_aabb = new AABB(possible_col, possible_pos);

				const depth = SpatialHashGrid.check_collision(aabb, possible_aabb);
				if (depth) {

					
					const collectible = possible.getComponent(Collectible) as Collectible;
					if (inventory && collectible) {
						inventory.increment(collectible.type);

						let emitter = possible.getComponent(ParticleEmitter) as ParticleEmitter;
						if (emitter && emitter.explosive) {
							emitter.emit = true;
						}
						possible.removeComponent(Sprite);
						possible.removeComponent(Collectible);
						possible.ttl = 1;
						continue;
					}

				

					let damage;
					if (health && (damage = possible.getComponent(Damage)) && damage.dealtBy.id != entity.id){
						let damage = (possible.getComponent(Damage) as Damage).value;
						health.value -= damage;
						console.log("taking damage", health.value, damage)
					}

					if (damage && damage.dealtBy.id !== possible.id) {
						const emitter = entity.getComponent(ParticleEmitter) as ParticleEmitter;
						if (emitter && emitter.explosive) {
							emitter.emit = true;
							entity.removeComponent(Collider);
							entity.removeComponent(Sprite);
							entity.removeComponent(Light);
							entity.ttl = 0.8;
						} else {
							//params.ecs.removeEntity(entity);
						}

						//const health = possible.getComponent(Health) as Health;
						//if (health) health.value -= damage.damage;
						continue;
					}

					if (entity.getComponent(Dynamic) && possible.getComponent(Static)) {
						let [x, y] = depth;

						//const player = entity.getComponent(Player);
						//if (player)console.log({x,y})

						if (Math.abs(x) < Math.abs(y) - collider.padding) {
							// removed collider.padding * 2
							position.x -= x;
						} else {
							if (y > 0 && x != 0) {
								if (y > collider.padding) {
									velocity.y = Math.min(0, velocity.y);
									position.y -= y - collider.padding;
									//if (player) console.log("collision bottom")
								} else if (y == collider.padding) {
									velocity.y = Math.min(0, velocity.y);
									collider.bottomCollision = true;
									//if (player) console.log("touching bottom")
								}
							} else if (y < 0 && x != 0) {
								if (Math.abs(y) > collider.padding) {
									position.y -= y + collider.padding;
									velocity.y = Math.max(0, velocity.y);
									//if (player) console.log("collision top")
								} else {
									collider.topCollision = true;
									//if (player) console.log("touching top")
								}
							}
						}
					}
				}
			}
		}
	}
}

type AiType = "walkTowards";

class Ai extends ECS.Component {
	time: number = 0;
	type: AiType;
	constructor(type: AiType = "walkTowards") {
		super();
		this.type = type;
	}
}

class AiSystem extends ECS.System {
	constructor() {
		super([Ai, DetectionRadius, Position, Input, Direction]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = (entity.getComponent(Position) as Position).vector;
		const detection = entity.getComponent(DetectionRadius) as DetectionRadius;
		const ai = entity.getComponent(Ai) as Ai;
		const input = entity.getComponent(Input) as Input;
		const direction = entity.getComponent(Direction) as Direction;
		input.pressed = {};

		for (const detected_entity of detection.detected) {
			if (detected_entity.getComponent(Player)) {
				const target_pos = (detected_entity.getComponent(Position) as Position).vector;
				const target_dir = target_pos.sub(position);

				const meleeRange = 7;

				if (Math.abs(target_dir.y) > 16) continue;

				if (target_dir.x > 5) {
					direction.right = true;
				} else if (target_dir.x < -5) {
					direction.right = false;
				}

				if (target_dir.magnitude() > meleeRange) {
					input.pressed[direction.right ? "KeyD" : "KeyA"] = true;
				} else {
					input.pressed["KeyF"] = true;
				}

				/*
				const offset = 8;
				position.y -= offset;
				target_position.y -= offset;
				dir.normalize();

				dir.scalarMult(500);

				ai.time += params.dt;
				if (ai.time > 0.3) {
					const projectile = new ECS.Entity(1)
						.addComponent(new Position(position.x, position.y, false))
						.addComponent(new Velocity(dir.x, dir.y))
						.addComponent(new Sprite(ONE_PIXEL, 1, 1))
						.addComponent(new Light(SMALL_LIGHT_SPRITE, 16, 16))
						.addComponent(new Collider(1, 1, 1, 1, 0, true))
						.addComponent(new Bullet(entity));
					params.ecs.addEntity(projectile);
					ai.time = 0;
				}
				*/
			}
		}
	}
}

class HudSystem extends ECS.System {
	coins: HTMLElement;
	constructor() {
		super([Inventory, Health], { updatesPerSecond: 2 });
		this.coins = document.querySelector("#coins")!;
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const inventory = entity.getComponent(Inventory) as Inventory;
		this.coins.innerText = `Coins: ${inventory.inventory.get("coin") || 0}`;
	}
}

class Particle {
	pos: Vector;
	vel: Vector;
	ttl: number = 1;
	size: number = 1;
	gravity: number = GRAVITY;
	active: boolean = true;
	alpha: number = 1;
}

interface ParticleConfig {
	maxCount: number;
	minSize: number;
	maxSize: number;
	minTTL: number;
	maxTTL: number;
	speed: number;
	alpha?: number;
	particlePerSecond?: number;
	positionSpread?: number;
	gravity?: number;
	explosive?: boolean;
	emit?: boolean;
}

class ParticleEmitter extends ECS.Component {
	particles: Particle[];
	time: number = 0;
	has_exploded: boolean = false;
	emit: boolean;
	freq: number;
	maxParticleCount: number;
	minSize: number;
	maxSize: number;
	minTtl: number;
	maxTtl: number;
	speed: number;
	alpha: number;
	gravity: number;
	positionSpread: number;
	explosive: boolean;

	constructor(params: ParticleConfig) {
		super();
		this.freq = 1 / params.particlePerSecond;
		this.maxParticleCount = params.maxCount || 10;
		this.minSize = params.minSize || 1;
		this.maxSize = params.maxSize || 4;
		this.minTtl = params.minTTL || 1;
		this.maxTtl = params.maxTTL || 2;
		this.alpha = params.alpha || 1;
		this.speed = params.speed || 10;
		this.explosive = params.explosive;
		this.gravity = params.gravity;
		this.emit = params.emit;
		this.positionSpread = params.positionSpread !== undefined ? params.positionSpread : 0;
		this.particles = [];
		this.emit = params.emit;
	}
}

class Particles {
	static createParticle(emitter: ParticleEmitter, position: Position): Particle {
		const particle = new Particle();
		particle.alpha = emitter.alpha;
		particle.gravity = emitter.gravity;
		particle.pos = position.vector.add(
			new Vector(
				randomFloat(-emitter.positionSpread, emitter.positionSpread),
				randomFloat(-emitter.positionSpread, emitter.positionSpread)
			)
		);
		particle.ttl = randomFloat(emitter.minTtl, emitter.maxTtl);
		particle.size = randomInteger(emitter.minSize, emitter.maxSize);
		particle.vel = new Vector(Math.random() - 0.5, Math.random() - 0.5).normalize().scalarMult(emitter.speed);
		return particle;
	}

	static updateParticles(emitter: ParticleEmitter, position: Position, params: ECS.UpdateParams): void {
		if (emitter.explosive && !emitter.has_exploded && emitter.emit) {
			for (let i = 0; i < emitter.maxParticleCount; i++) {
				emitter.particles.push(Particles.createParticle(emitter, position));
			}
			emitter.has_exploded = true;
		} else if (!emitter.explosive && emitter.emit && (emitter.time += params.dt) > emitter.freq) {
			emitter.time = 0;
			emitter.particles.push(Particles.createParticle(emitter, position));
		}

		for (const particle of emitter.particles) {
			if ((particle.ttl -= params.dt) < 0) continue;

			particle.pos.x += particle.vel.x * params.dt;
			particle.pos.y += particle.vel.y * params.dt;
			particle.vel.y += particle.gravity * params.dt;

			particle.pos.round();

			params.context.fillStyle = `rgba(255,255,255,${particle.alpha})`;
			params.context.fillRect(
				particle.pos.x - WINDOW_OFFSET_X - Math.round(particle.size / 2),
				particle.pos.y + WINDOW_OFFSET_Y - Math.round(particle.size / 2),
				particle.size,
				particle.size
			);
		}

		if (emitter.particles.length > emitter.maxParticleCount) {
			emitter.particles.shift();
		}
	}
}

class ParticleSystem extends ECS.System {
	constructor() {
		super([Position, ParticleEmitter]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = entity.getComponent(Position) as Position;
		const emitter = entity.getComponent(ParticleEmitter) as ParticleEmitter;
		Particles.updateParticles(emitter, position, params);
	}
}

const sph = new SpatialHashGrid(64);

const ecs = new ECS.ECS();
ecs.addSystem(new InputSystem());
ecs.addSystem(new CameraSystem());
ecs.addSystem(new PhysicsSystem());
ecs.addSystem(new CollisionSystem(sph));
ecs.addSystem(new DetectionSystem(sph));
ecs.addSystem(new AiSystem());
ecs.addSystem(new MovementSystem());
ecs.addSystem(new CombatSystem());
ecs.addSystem(new SpriteSystem());
ecs.addSystem(new ParticleSystem());
ecs.addSystem(new LightSystem());
ecs.addSystem(new HealthSystem());
ecs.addSystem(new HudSystem());
ecs.addSystem(new PositionChangeSystem());

function spawnPlayer(player: ECS.Entity, x: number, y: number) {
	console.log("spawn", { x, y });

	// reset camera
	WINDOW_OFFSET_X = 0;
	WINDOW_OFFSET_Y = 0;
	WINDOW_CENTER_X = canvas.width / 2;

	player.addComponent(new Velocity(0, 0))
	.addComponent(new Gravity())
	.addComponent(new Direction())
	.addComponent(new Dynamic())
	.addComponent(new Player())
	.addComponent(new Input())
	.addComponent(new Inventory())
	.addComponent(new Health())
	//.addComponent(new Light(BIG_LIGHT_SPRITE, 128, 128, 12))
	//.addComponent(new Light(CHARACTER_LIGHT, 16, 16, 8))
	.addComponent(new Position(WINDOW_CENTER_X - 16 * x, GROUND_LEVEL - 16 * y))
	.addComponent(new Collider(16, 2, 0, 2, 3, true))
	.addComponent(new Detectable())
	.addComponent(new Speed())
	.addComponent(
		new ParticleEmitter({
			particlePerSecond: 15,
			minTTL: 0.1,
			maxTTL: 0.4,
			minSize: 2,
			maxSize: 3,
			maxCount: 20,
			alpha: 0.6,
			speed: 20,
			gravity: 0,
		})
	)
	.addComponent(
		new Sprite(CHARACTER_SPRITE, 16, 16, [
			new SpriteState("idle-right", { frameY: 0, frames: 1 }),
			new SpriteState("idle-left", { frameY: 1, frames: 1 }),
			new SpriteState("jump-right", { frameY: 2, frames: 1 }),
			new SpriteState("jump-left", { frameY: 3, frames: 1 }),
			new SpriteState("run-right", { frameY: 4, frames: 4 }),
			new SpriteState("run-left", { frameY: 5, frames: 4 }),
			new SpriteState("melee-right", { frameY: 6, frames: 3, playOnce: true }),
			new SpriteState("melee-left", { frameY: 7, frames: 3, playOnce: true }),
		])
	);
}

async function spawnMap() {
	let res = await fetch("assets/objects.json");
	let json = await res.json();

	for (let { type, x, y } of json) {
		switch (type) {
			case "villain-1": {
				const entity = new ECS.Entity();
				entity
					.addComponent(new Position(x * 16, GROUND_LEVEL - 16 * y))
					.addComponent(
						new Sprite(VILLAIN_SPRITE, 16, 16, [
							new SpriteState("idle-left", { frameY: 0, frames: 4 }),
							new SpriteState("idle-right", { frameY: 1, frames: 4 }),
							new SpriteState("run-left", { frameY: 0, frames: 4 }),
							new SpriteState("run-right", { frameY: 1, frames: 4 }),
							new SpriteState("melee-left", { frameY: 3, frames: 3, playOnce: true }),
							new SpriteState("melee-right", { frameY: 2, frames: 3, playOnce: true }),
						])
					)
					.addComponent(new Ai())
					.addComponent(new Direction())
					.addComponent(new Dynamic())
					.addComponent(new Input())
					.addComponent(new Gravity())
					.addComponent(new Speed(30))
					.addComponent(new Health())
					.addComponent(new Collider(16, 3, 0, 3, 3, true))
					.addComponent(new Velocity(0, 0))
					.addComponent(new DetectionRadius(randomInteger(32, 64)));

				ecs.addEntity(entity);

				break;
			}

			case "tile-1": {
				const box = new ECS.Entity()
					.addComponent(new Position(x * 16, GROUND_LEVEL - 16 * y))
					.addComponent(new Sprite(TILE_SPRITE, 16, 16, [new SpriteState("tile", { frameY: 0, frameX: 0 })]))
					.addComponent(new Collider(16, 8, 0, 8, 0, false))
					.addComponent(new Static());
				ecs.addEntity(box);
				break;
			}

			case "coin": {
				let sprite = new Sprite(COIN_SPRITE, 16, 16, [new SpriteState("idle", { frameY: 0, frames: 6 })]);
				sprite.flushBottom = false;
				ecs.addEntity(
					new ECS.Entity()
						.addComponent(new Position(16 * x, GROUND_LEVEL - 16 * y - 8))
						.addComponent(sprite)
						.addComponent(new Collectible("coin"))
						.addComponent(
							new ParticleEmitter({
								particlePerSecond: 10,
								minTTL: 0.4,
								maxTTL: 0.6,
								minSize: 1,
								maxSize: 2,
								maxCount: 10,
								alpha: 1.0,
								gravity: -200,
								speed: 0,
								positionSpread: 5,
								explosive: true,
							})
						)
						.addComponent(new Collider(3, 3, 3, 3))
				);
				break;
			}

			case "light": {
				let sprite = new Sprite(bulletSprite, 4, 4);
				sprite.flushBottom = false;
				ecs.addEntity(
					new ECS.Entity()
						.addComponent(new Position(16 * x, GROUND_LEVEL - 16 * y - 8))
						.addComponent(new Light(BRIGHT_LIGHT_SPRITE, 128, 128))
						.addComponent(sprite)
				);
				break;
			}

			default:
				console.log("unkown");
		}
	}
}

document.addEventListener("keydown", (e) => {
	switch (e.code) {
		case "KeyP": {
			if (gameState.current.name == "pause") {
				gameState.setPreviousState();
			} else {
				gameState.setState("pause");
			}
			break;
		}

		case "KeyO": {
			spawnPlayer(player, randomInteger(3, 30), randomInteger(1, 10));
			break;
		}
	}
});

document.addEventListener("click", () => {
	switch (gameState.current.name) {
		case "title":
			gameState.setState("play");
			break;
		case "dead":
			// TODO reset everything
			location.reload();
			break;
	}
});

const fps_display = document.querySelector("#fps") as HTMLElement;
let tmp = 0;

let dt: number = 0;
let then: number = 0;

ecs.addEntity(player);

spawnMap();
spawnPlayer(player, 3, 1);

function animate(now: number) {
	(now *= 0.001), (dt = now - then), (then = now);

	if ((tmp += dt) > 1) {
		tmp = 0;
		const fps = `${(1 / dt).toFixed(2)} fps`;
		fps_display.innerText = fps;
	}

	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = "rgb(0,0,0)";
	context.fillRect(0, 0, canvas.width, canvas.height);

	if (gameState.current.name == "play") {
		context.beginPath();
		context.moveTo(0, GROUND_LEVEL + 0.5 + WINDOW_OFFSET_Y);
		context.lineTo(canvas.width, GROUND_LEVEL + 0.5 + WINDOW_OFFSET_Y);
		context.strokeStyle = "#fff";
		context.lineWidth = 1;
		context.stroke();
		context.closePath();

		ecs.update({ dt, canvas, context, ecs });
	}
	requestAnimationFrame(animate);
}

animate(0);
