import * as ECS from "lofi-ecs";

class Vector extends ECS.Component {
	x: number;
	y: number;

	constructor(x, y) {
		super();
		this.x = x;
		this.y = y;
	}
}

class Acceleration extends Vector {}

class Velocity extends Vector {}

class Position extends ECS.Component {
	_x: number;
	_y: number;

	constructor(x: number, y: number) {
		super();
		this._x = x;
		this._y = y;
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

	constructor() {
		super();
		this.pressed = {};
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

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;
		const velocity = entity.getComponent(Velocity) as Velocity;

		velocity.x = 0;

		if (input.pressed["KeyA"]) velocity.x = -100;

		if (input.pressed["KeyD"]) velocity.x = 200;

		if (input.pressed["Space"])velocity.y = -100;
		
	}
}

class PhysicsSystem extends ECS.System {
	constructor() {
		super([Position, Velocity]); // necessary Components
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const velocity = entity.getComponent(Velocity) as Velocity;
		const position = entity.getComponent(Position) as Position;

		console.log(velocity.x.toFixed(2), velocity.y.toFixed(2))

		position.x += params.dt * velocity.x;
		position.y += params.dt * velocity.y;

		if (position.y < params.canvas.height) {
			velocity.y += params.dt * 500;
		}

		if (position.y > params.canvas.height) {
			console.log("clamp")
			position.y = params.canvas.height;
			velocity.y = 0;
		} 
		if (position.y < 0){
			console.log("clamp")
			position.y = 0
			velocity.y = 0;
		} 

		if (position.x > params.canvas.width){
			console.log("clamp")
			position.x = params.canvas.width
			velocity.x = 0;
		} 
		if(position.x < 0 ){
			console.log("clamp")
			position.x = 0;
			velocity.x = 0;
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

let sprite = new Image();
sprite.src = "assets/sprite.png";

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

	ecs.update({ dt, canvas, context });
	requestAnimationFrame(animate);
}

animate(0);
