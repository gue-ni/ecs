import * as ECS from "../../lib";
import { randomInteger, randomFloat, Vector } from "./util";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
const player = new ECS.Entity({ id: "Player" });

const ON_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

let WINDOW_OFFSET_X = 0;
let WINDOW_OFFSET_Y = 0;
let WINDOW_CENTER_X = canvas.width / 2;

let LEVEL = 1;

const GRAVITY = 500;
const DARKNESS = 0.9;
const TILE_SIZE = 16;
const FRAME_RATE = 1 / 12;
const BOTTOM_BORDER = TILE_SIZE * 2;
const GROUND_LEVEL = canvas.height - BOTTOM_BORDER;

const MELEE_KEY = "KeyJ";
const SHOOT_KEY = "KeyK";
const GRENADE_KEY = "KeyL";

class PlayState extends ECS.HTMLElementState {
	enter(): void {
		super.enter();
		loadLevel(LEVEL)
	}

	exit(): void {
		super.exit();
	}
}

const game = new ECS.FiniteStateMachine();
game.addState(new PlayState("play", "#hud"));
game.addState(new ECS.HTMLElementState("dead", "#dead"));
game.addState(new ECS.HTMLElementState("title", "#title"));
game.addState(new ECS.HTMLElementState("pause", "#paused"));
game.addState(new ECS.HTMLElementState("loading", "#loading"));
game.addState(new ECS.HTMLElementState("orientation", "#orientation"));
game.setState("title");

const CHARACTER_SPRITE = new Image();
CHARACTER_SPRITE.src = "assets/sprites.png";

const VILLAIN_SPRITE = new Image();
VILLAIN_SPRITE.src = "assets/bones.png";

const spikes = new Image();
spikes.src = "assets/bottom_spikes.png";

const HEART_SPRITE = new Image();
HEART_SPRITE.src = "assets/heart.png";

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

class Detectable extends ECS.Component {}

class Static extends ECS.Component {}

class Gravity extends ECS.Component {}

class Player extends ECS.Component {}

class Gun extends ECS.Component {
	damage: number;
	velocity: number;
	firingRate: number;
	constructor(damage: number = 10, velocity: number = 90, firingRate: number = 500) {
		super();
		this.damage = damage;
		this.velocity = velocity;
		this.firingRate = firingRate;
	}
}

class DieOnCollision extends ECS.Component {}

class Dynamic extends ECS.Component {}

class Speed extends ECS.Component {
	value: number;
	constructor(value: number = 50) {
		super();
		this.value = value;
	}
}

class Collectible extends ECS.Component {
	type: string;
	constructor(type: string = "default") {
		super();
		this.type = type;
	}
}

class Melee extends ECS.Component {
	range: number;
	delaySeconds: number;
	time: number = 0;
	damage: number;
	inProgress: boolean = false;
	constructor(range: number = 16, damage: number = 10, delaySeconds: number = 0) {
		super();
		this.range = range;
		this.damage = damage;
		this.delaySeconds = delaySeconds;
	}
}

class Damage extends ECS.Component {
	value: number;
	constructor(damage: number = 10) {
		super();
		this.value = damage;
	}
}

class Velocity extends ECS.Component {
	x: number;
	y: number;

	constructor(x: number = 0, y: number = 0) {
		super();
		this.x = x;
		this.y = y;
	}

	get vector(): Vector {
		return new Vector(this.x, this.y);
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
	flushBottom: boolean;

	constructor(
		image: HTMLImageElement,
		width: number,
		height: number,
		states: SpriteState[] = [],
		flushBottom: boolean = true
	) {
		super();
		this.image = image;
		this.width = width;
		this.height = height;
		this.time = 0;
		this.flushBottom = flushBottom;
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

type MouseButton = "left" | "right";

class Input extends ECS.Component {
	pressed: any;
	last_pressed: any;

	mouse: any;
	mouse_last_pressed: any;

	mouseY: number;
	mouseX: number;

	doubleJumpAllowed: boolean = false;

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

	is_mouse_pressed(side: MouseButton, delay?: number): boolean {
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

	add(type: string) {
		let num = this.inventory.get(type) || 0;
		this.inventory.set(type, num + 1);
	}
}

class Health extends ECS.Component {
	value: number;
	impactOnly: boolean;
	constructor(value: number = 100, impactOnly: boolean = false) {
		super();
		this.value = value;
		this.impactOnly = impactOnly;
	}
}

class HealthSystem extends ECS.System {
	healthDisplay: HTMLElement;
	constructor() {
		super([Health]);
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
				//console.log("you died!");
				game.setState("dead");
			} else {
				// if it has a death particle animation, play it
				const emitter = entity.getComponent(ParticleEmitter) as ParticleEmitter;
				if (emitter && emitter.explosive) {
					//console.log("explode and remove", entity.id, health.value);
					entity.removeComponent(Collider);
					entity.removeComponent(Sprite);
					entity.removeComponent(Health);
					entity.removeComponent(Damage);
					entity.removeComponent(Gun);
					entity.removeComponent(Melee);
					entity.removeComponent(Ai);
					entity.removeComponent(Light);
					entity.ttl = emitter.maxTtl;
					emitter.emit = true;
				} else {
					// console.log("remove", entity.id);
					params.ecs.removeEntity(entity);
				}
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
		const maxDiffY = canvas.height - BOTTOM_BORDER * 2;
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

class MobileInputSystem extends ECS.System {
	keys: any;
	mouse: any;

	mouseX: number;
	mouseY: number;

	constructor() {
		super([Input, Player]);

		this.keys = {};
		this.mouse = {};

		const handleTouch = (e: TouchEvent) => {
			let touch = e.touches[0];
			let x = touch.clientX - bbox.left;
			let width = left_control.offsetWidth;
			//let tolerance = width * 0.1;

			let tolerance = 0;
			if (x < width / 2 - tolerance) {
				this.keys["KeyA"] = true;
				this.keys["KeyD"] = false;
			} else if (x > width / 2 + tolerance) {
				this.keys["KeyA"] = false;
				this.keys["KeyD"] = true;
			}
		};

		const left_control = document.querySelector("#left-control") as HTMLElement;
		left_control.style.display = "flex";
		let bbox = left_control.getBoundingClientRect();

		left_control.addEventListener("touchmove", handleTouch);

		left_control.addEventListener("touchstart", handleTouch);

		left_control.addEventListener("touchend", () => {
			delete this.keys["KeyD"];
			delete this.keys["KeyA"];
		});

		const right_control = document.querySelector("#right-control") as HTMLElement;
		right_control.style.display = "flex";
		right_control.addEventListener("touchstart", () => {
			this.keys["KeyW"] = true;
		});
		right_control.addEventListener("touchend", () => {
			delete this.keys["KeyW"];
		});

		const button_1 = document.querySelector("#button-1") as HTMLElement;
		button_1.style.display = "flex";
		button_1.addEventListener("touchstart", () => {
			this.keys[MELEE_KEY] = true;
		});
		button_1.addEventListener("touchend", () => {
			delete this.keys[MELEE_KEY];
		});

		const button_2 = document.querySelector("#button-2") as HTMLElement;
		button_2.style.display = "flex";
		button_2.addEventListener("touchstart", () => {
			this.keys[SHOOT_KEY] = true;
		});
		button_2.addEventListener("touchend", () => {
			delete this.keys[SHOOT_KEY];
		});

		const button_3 = document.querySelector("#button-3") as HTMLElement;
		button_3.style.display = "flex";
		button_3.addEventListener("touchstart", () => {
			this.keys[GRENADE_KEY] = true;
		});
		button_3.addEventListener("touchend", () => {
			delete this.keys[GRENADE_KEY];
		});
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		input.pressed = { ...this.keys };
		input.mouse = { ...this.mouse };

		//input.mouseX = this.mouseX;
		//input.mouseY = this.mouseY;
	}
}

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

		const standing = aabb.bottomCollision || position.y == GROUND_LEVEL;
		const speedVal = speed.value;
		const jump_speed = -180;

		let leftRight = 0;

		if (standing || entity.getComponent(Player)) {
			if (input.is_key_pressed("KeyA") || input.is_key_pressed("ArrowLeft")) {
				leftRight = -1;
				direction.right = false;
			} else if (input.is_key_pressed("KeyD") || input.is_key_pressed("ArrowRight")) {
				leftRight = 1;
				direction.right = true;
			}

			velocity.x = speedVal * leftRight;
		}

		if (
			(input.is_key_pressed("KeyW", 300) || input.is_key_pressed("ArrowUp", 300)) &&
			(standing || (input.doubleJumpAllowed && !standing)) &&
			!aabb.topCollision
		) {
			input.doubleJumpAllowed = standing;
			velocity.y = jump_speed;
		}

		if (sprite.state.playOnce) return;

		sprite.setState(direction.right ? "idle-right" : "idle-left");
		if (emitter) emitter.emit = false;

		if (Math.abs(leftRight) > 0) {
			sprite.setState(direction.right ? "run-right" : "run-left");
		}

		if (!standing) {
			sprite.setState(direction.right ? "jump-right" : "jump-left");
			if (emitter && !emitter.explosive && velocity.y < 0) emitter.emit = true;
		}
	}
}

class MeleeSystem extends ECS.System {
	sph: SpatialHashGrid;
	constructor(sph: SpatialHashGrid) {
		super([Input, Position, Sprite, Melee, Direction]);
		this.sph = sph;
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		const sprite = entity.getComponent(Sprite) as Sprite;
		const position = entity.getComponent(Position) as Position;
		const direction = entity.getComponent(Direction) as Direction;
		const melee = entity.getComponent(Melee) as Melee;

		if (input.is_key_pressed(MELEE_KEY, 250)) {
			melee.inProgress = true;
			sprite.setState(direction.right ? "melee-right" : "melee-left");
		}

		if (melee.inProgress) {
			if ((melee.time += params.dt) > melee.delaySeconds) {
				melee.time = 0;
				const aabb = new AABB(new Collider(melee.range, melee.range / 2, 0, melee.range / 2), position);
				for (const collision of this.sph.collisions(entity, aabb)) {
					const health = collision.entity.getComponent(Health) as Health;
					const velocity = collision.entity.getComponent(Velocity) as Velocity;
					const otherDir = collision.entity.getComponent(Direction) as Direction;

					if (health) {
						health.value -= melee.damage;
					}

					if (velocity && otherDir && entity.getComponent(Player)) {
						velocity.x = (otherDir.right ? -1 : 1) * 100;
						velocity.y = -100;
					}
				}
				melee.inProgress = false;
			}
		}
	}
}

class GunSystem extends ECS.System {
	constructor() {
		super([Input, Position, Gun, Direction]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		const direction = entity.getComponent(Direction) as Direction;
		const position = entity.getComponent(Position) as Position;
		const gun = entity.getComponent(Gun) as Gun;

		const gunPosOffset = 10;
		/*
		const shootDir = new Vector(
			input.mouseX - (position.x - WINDOW_OFFSET_X),
			input.mouseY - (position.y + WINDOW_OFFSET_Y - gunPosOffset)
		).normalize();
		*/

		const shootDir = new Vector(direction.right ? 1 : -1, 0);

		const explosion = {
			minTTL: 0.1,
			maxTTL: 0.3,
			minSize: 1,
			maxSize: 2,
			maxCount: 7,
			alpha: 1,
			gravity: GRAVITY,
			speed: 27,
			positionSpread: 5,
			explosive: true,
		};

		if (input.is_mouse_pressed("left", gun.firingRate) || input.is_key_pressed(SHOOT_KEY, gun.firingRate)) {
			shootDir.scalarMult(gun.velocity);

			const bullet = new ECS.Entity({ ttl: 1, id: `Bullet-${randomInteger(1, 10000)}` })
				.addComponent(new Position(position.x, position.y - gunPosOffset, false))
				.addComponent(new Velocity(shootDir.x, shootDir.y))
				.addComponent(new Sprite(ONE_PIXEL, 2, 2))
				.addComponent(new Health(1, true))
				.addComponent(new DieOnCollision())
				.addComponent(new Light(SMALL_LIGHT_SPRITE, 16, 16))
				.addComponent(new Collider(1, 1, 1, 1, 0, true, entity.id))
				.addComponent(new Damage(gun.damage))
				.addComponent(new ParticleEmitter(explosion));

			params.ecs.addEntity(bullet);
		}

		if (input.is_mouse_pressed("right", 500) || input.is_key_pressed(GRENADE_KEY, 500)) {
			shootDir.scalarMult(200);

			let sprite = new Sprite(bulletSprite, 4, 4, [], false);
			//sprite.flushBottom = false;

			const grenade = new ECS.Entity({ ttl: 1, id: `Grenade-${randomInteger(1, 10000)}` })
				.addComponent(new Position(position.x, position.y - gunPosOffset, false))
				.addComponent(new Velocity(shootDir.x, shootDir.y))
				.addComponent(new Light(BRIGHT_LIGHT_SPRITE, 128, 128))
				.addComponent(sprite)
				.addComponent(new Health(1, true))
				.addComponent(new DieOnCollision())
				.addComponent(new Collider(1, 1, 1, 1, 0, true, entity.id))
				.addComponent(new ParticleEmitter(explosion))
				.addComponent(new Damage(150));
			params.ecs.addEntity(grenade);
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

		position._lastX = position._x;
		position._lastY = position._y;

		position.x = position.x + params.dt * velocity.x;
		position.y = position.y + params.dt * velocity.y;

		/*
		let xSpeed = params.dt * velocity.x;
		let xDiff = position.x - position._lastX;
		console.log(entity.id, xDiff, xSpeed);
		*/

		if (
			position.y < GROUND_LEVEL &&
			(!aabb || !aabb.bottomCollision) &&
			entity.getComponent(Gravity) &&
			velocity.y < 400
		) {
			velocity.y += params.dt * GRAVITY;
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
			this.context.fillStyle = `rgba(0, 0, 0, ${DARKNESS})`;
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

		if (sprite.state.playOnce && sprite.state.frameX == sprite.state.frames - 1) {
			sprite.setPreviousState();
		}

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

	ignoreCollisionsWith: string;

	constructor(
		top: number,
		right: number,
		bottom: number,
		left: number,
		padding: number = 0,
		active: boolean = false,
		ignoreCollisionWith: string = null
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
		this.ignoreCollisionsWith = ignoreCollisionWith;
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
	entities: ECS.Entity[];

	constructor(range: number) {
		super(range, range, range, range);
	}
}

interface Collision {
	depth: number[];
	entity: ECS.Entity;
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

	collisions(entity: ECS.Entity, aabb: AABB): Collision[] {
		let collisions = [];
		for (const other of this.possible_collisions(entity, aabb)) {
			const aabb_b = new AABB(other.getComponent(Collider) as Collider, other.getComponent(Position) as Position);

			let depth = SpatialHashGrid.check_collision(aabb, aabb_b);
			if (depth) collisions.push({ depth: depth, entity: other });
		}

		return collisions;
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
		const position = entity.getComponent(Position) as Position;
		const detection = entity.getComponent(DetectionRadius) as DetectionRadius;
		const aabb = new AABB(detection, position);
		detection.entities = [];

		for (const collision of this.sph.collisions(entity, aabb)) {
			if (collision.entity.getComponent(Detectable)) {
				detection.entities.push(collision.entity);
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
		const health = entity.getComponent(Health) as Health;
		const damage = entity.getComponent(Damage) as Damage;
		const collider = entity.getComponent(Collider) as Collider;
		const position = entity.getComponent(Position) as Position;
		const velocity = entity.getComponent(Velocity) as Velocity;
		const inventory = entity.getComponent(Inventory) as Inventory;

		const aabb = new AABB(collider, position);

		if (position.changed) {
			this.sph.remove(entity);
			this.sph.insert(entity, aabb);
		}

		collider.topCollision = false;
		collider.bottomCollision = false;

		if (collider.active) {
			for (const { entity: other, depth } of this.sph.collisions(entity, aabb)) {
				const otherCollider = other.getComponent(Collider) as Collider;

				if (other.id == collider.ignoreCollisionsWith || otherCollider.ignoreCollisionsWith == entity.id) {
					//console.log("ignore collision", entity.id, other.id);
					continue;
				} else {
					if (entity.getComponent(Player) || other.getComponent(Player)) {
						//console.log("collision", entity.id, other.id);
					}
				}

				// colliding from above, kill other entity
				const otherHealth = other.getComponent(Health) as Health;
				if (entity.getComponent(Player) && otherHealth && velocity && velocity.y > 200) {
					//console.log("collide from above", entity.id, other.id);
					otherHealth.value = 0;
				}

				if (
					health &&
					entity.getComponent(DieOnCollision) &&
					(other.getComponent(Static) || other.getComponent(Dynamic))
				) {
					health.value = 0;
				}

				// if its collectible, collect it
				const collectible = other.getComponent(Collectible) as Collectible;
				if (inventory && collectible && health) {
					otherHealth.value = 0;

					switch (collectible.type) {
						case "heart":
							if (health) health.value = 100;
							break;

						default:
							inventory.add(collectible.type);
					}

					//console.log("collect", collectible.type, entity.id, other.id);
				}

				// if it does damage, take the damage
				const otherDamage = other.getComponent(Damage) as Damage;
				if (!collider.active && health && !health.impactOnly && otherDamage) {
					health.value -= otherDamage.value;
					//console.log("take damage", entity.id, other.id);
				}

				// if you do damage, deal the damage
				if (damage && otherHealth && !otherHealth.impactOnly) {
					otherHealth.value -= damage.value;
					//console.log("deal damage", entity.id, other.id);
				}

				// remove health upon high speed collision (eg fall damage or bullet impact)
				/*
				if (
					!entity.getComponent(Player) &&
					(other.getComponent(Static) || other.getComponent(Dynamic)) &&
					health &&
					velocity &&
					velocity.vector.magnitude() > 100
				) {
					health.value -= 1;
					//console.log("high speed impact", entity.id, other.id);
				}
				*/

				// do collision physics
				if (velocity && other.getComponent(Static)) {
					let [x, y] = depth;

					if (Math.abs(x) < Math.abs(y) - collider.padding) {
						position.x -= x;
					} else {
						if (y > 0 && x != 0) {
							if (y > collider.padding) {
								velocity.y = Math.min(0, velocity.y);
								position.y -= y - collider.padding;
							} else if (y == collider.padding) {
								velocity.y = Math.min(0, velocity.y);
								collider.bottomCollision = true;
							}
						} else if (y < 0 && x != 0) {
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

class Ai extends ECS.Component {}

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

		for (const detected_entity of detection.entities) {
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
					input.pressed[SHOOT_KEY] = true;
				} else {
					input.pressed[MELEE_KEY] = true;
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
	positionOffset?: Vector;
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
	positionOffset: Vector;

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
		this.positionOffset = params.positionOffset || new Vector(0, 0);
		this.emit = params.emit;
	}
}

class Particles {
	static createParticle(emitter: ParticleEmitter, position: Position): Particle {
		const particle = new Particle();
		particle.alpha = emitter.alpha;
		particle.gravity = emitter.gravity;
		particle.pos = position.vector
			.add(emitter.positionOffset)
			.add(
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
ecs.addSystem(ON_MOBILE ? new MobileInputSystem() : new InputSystem());
ecs.addSystem(new CameraSystem());
ecs.addSystem(new PhysicsSystem());
ecs.addSystem(new CollisionSystem(sph));
ecs.addSystem(new DetectionSystem(sph));
ecs.addSystem(new AiSystem());
ecs.addSystem(new HealthSystem());
ecs.addSystem(new MovementSystem());
ecs.addSystem(new GunSystem());
ecs.addSystem(new MeleeSystem(sph));
ecs.addSystem(new SpriteSystem());
ecs.addSystem(new ParticleSystem());
ecs.addSystem(new LightSystem());
ecs.addSystem(new HudSystem());
ecs.addSystem(new PositionChangeSystem());

async function spawnPlayer(player: ECS.Entity, x: number, y: number) {
	// reset camera
	WINDOW_OFFSET_X = TILE_SIZE * x;
	WINDOW_OFFSET_Y = 0;
	WINDOW_CENTER_X = canvas.width / 2 + TILE_SIZE * x;

	player
		.addComponent(new Velocity())
		.addComponent(new Gravity())
		.addComponent(new Direction())
		.addComponent(new Dynamic())
		.addComponent(new Player())
		.addComponent(new Gun())
		.addComponent(new Input())
		.addComponent(new Melee(20, 50))
		.addComponent(new Inventory())
		.addComponent(new Health())
		.addComponent(new Light(BIG_LIGHT_SPRITE, 128, 128, 12))
		.addComponent(new Position(TILE_SIZE * x, GROUND_LEVEL - TILE_SIZE * y))
		.addComponent(new Collider(16, 2, 0, 2, 3, true))
		.addComponent(new Detectable())
		.addComponent(new Speed(70))
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

async function loadLevel(level: number) {
	const res = await fetch(`assets/level-${level}.json`);
	const level_data = await res.json();
	let i = 0;

	for (let { type, x, y } of level_data) {
		i++;
		switch (type) {
			case "player": {
				console.log("create player", x, y);
				spawnPlayer(player, x, y);
				break;
			}

			case "enemy-1": {
				const entity = new ECS.Entity({ id: `Enemy-${i}` });
				entity
					.addComponent(new Position(x * TILE_SIZE, GROUND_LEVEL - TILE_SIZE * y))
					.addComponent(
						new Sprite(VILLAIN_SPRITE, 16, 16, [
							new SpriteState("idle-left", { frameY: 0, frames: 6 }),
							new SpriteState("idle-right", { frameY: 1, frames: 6 }),
							new SpriteState("run-left", { frameY: 0, frames: 6 }),
							new SpriteState("run-right", { frameY: 1, frames: 6 }),
							new SpriteState("melee-left", { frameY: 3, frames: 3, playOnce: true }),
							new SpriteState("melee-right", { frameY: 2, frames: 3, playOnce: true }),
						])
					)
					.addComponent(new Ai())
					.addComponent(new Direction())
					.addComponent(new Dynamic())
					.addComponent(new Input())
					.addComponent(new Gun())
					.addComponent(new Gravity())
					.addComponent(new Speed(50))
					.addComponent(new Melee(16, 10, 0.5))
					.addComponent(new Health())
					.addComponent(new Collider(16, 6, 0, 6, 3, true))
					.addComponent(new Velocity(0, 0))
					.addComponent(new DetectionRadius(randomInteger(50, 70)))
					.addComponent(
						new ParticleEmitter({
							particlePerSecond: 10,
							minTTL: 0.4,
							maxTTL: 0.6,
							minSize: 1,
							maxSize: 2,
							maxCount: 10,
							alpha: 1.0,
							positionOffset: new Vector(0, -8),
							gravity: -200,
							speed: 0,
							positionSpread: 5,
							explosive: true,
						})
					);

				ecs.addEntity(entity);

				break;
			}

			case "tile-1": {
				const box = new ECS.Entity({ id: `Tile-${i}` })
					.addComponent(new Position(x * TILE_SIZE, GROUND_LEVEL - TILE_SIZE * y))
					.addComponent(new Sprite(TILE_SPRITE, 16, 16, [new SpriteState("tile", { frameY: 0, frameX: 0 })]))
					.addComponent(new Collider(16, 8, 0, 8, 0, false))
					.addComponent(new Static());
				ecs.addEntity(box);
				break;
			}

			case "heart": {
				console.log("add heart");
				ecs.addEntity(
					new ECS.Entity()
						.addComponent(new Position(16 * x, GROUND_LEVEL - 16 * y - 8))
						.addComponent(
							new Sprite(HEART_SPRITE, 16, 16, [new SpriteState("idle", { frameY: 0, frames: 5 })], false)
						)
						.addComponent(new Collectible("heart"))
						.addComponent(new Health(1))
						.addComponent(new Collider(3, 3, 3, 3))
						.addComponent(
							new ParticleEmitter({
								particlePerSecond: 10,
								minTTL: 0.4,
								maxTTL: 0.6,
								minSize: 1,
								maxSize: 2,
								maxCount: 5,
								alpha: 1.0,
								gravity: -200,
								speed: 0,
								positionSpread: 5,
								explosive: true,
							})
						)
				);
				break;
			}

			case "coin": {
				ecs.addEntity(
					new ECS.Entity()
						.addComponent(new Position(16 * x, GROUND_LEVEL - 16 * y - 8))
						.addComponent(
							new Sprite(COIN_SPRITE, 16, 16, [new SpriteState("idle", { frameY: 0, frames: 6 })], false)
						)
						.addComponent(new Collectible("coin"))
						.addComponent(new Health(1))
						.addComponent(
							new ParticleEmitter({
								particlePerSecond: 10,
								minTTL: 0.4,
								maxTTL: 0.6,
								minSize: 1,
								maxSize: 2,
								maxCount: 5,
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
		}
	}
}

document.addEventListener("keydown", (e) => {
	switch (e.code) {
		case "KeyP": {
			if (game.current.name == "pause") {
				game.setPreviousState();
			} else {
				game.setState("pause");
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
	switch (game.current.name) {
		case "title":
			game.setState("play");
			break;
		case "dead":
			game.setState("play");
			spawnPlayer(player, randomInteger(3, 30), randomInteger(1, 10));
			break;
	}
});

document.addEventListener(
	"touchstart",
	() => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().then(() => {
				screen.orientation.lock("landscape");
				if (game.current.name === "title") game.setState("play");
			});
		}
	},
	false
);

const fps_display = document.querySelector("#fps") as HTMLElement;
let tmp = 0;

let dt: number = 0;
let then: number = 0;

ecs.addEntity(player);

function animate(now: number) {
	now *= 0.001;
	dt = now - then;
	then = now;

	if ((tmp += dt) > 1) {
		fps_display.innerText = `${(1 / dt).toFixed(2)} fps (${dt.toFixed(3)} dt)`;
		tmp = 0;
	}

	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = "#000";
	context.fillRect(0, 0, canvas.width, canvas.height);

	if (game.current.name == "play") {
		{
			context.beginPath();
			context.moveTo(0, GROUND_LEVEL + 0.5 + WINDOW_OFFSET_Y);
			context.lineTo(canvas.width, GROUND_LEVEL + 0.5 + WINDOW_OFFSET_Y);
			context.strokeStyle = "#fff";
			context.lineWidth = 1;
			context.stroke();
			context.closePath();
		}

		ecs.update({ dt, canvas, context, ecs });
	}
	requestAnimationFrame(animate);
}

animate(0);
