import * as ECS from "../../lib";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

const GRAVITY = 500;

const SPRITE = new Image();
SPRITE.src = "/assets/sprite.png";

function randomFloat(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

class Velocity extends ECS.Component {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		super();
		this.x = x;
		this.y = y;
	}
}

class Position extends ECS.Component {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		super();
		this.x = x;
		this.y = y;
	}
}

class Sprite extends ECS.Component {
	image: HTMLImageElement;
	width: number;
	height: number;
	constructor(image: HTMLImageElement, width: number, height: number) {
		super();
		this.image = image;
		this.width = width;
		this.height = height;
	}
}

class Ball extends ECS.Component {
	radius: number;
	constructor(radius: number = 10){
		super()
		this.radius = radius;
	}
}

class PhysicsSystem extends ECS.System {
	constructor() {
		super([Position, Velocity]); // necessary Components
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = entity.getComponent(Position) as Position;
		const velocity = entity.getComponent(Velocity) as Velocity;

		position.x = position.x + params.dt * velocity.x;
		position.y = position.y + params.dt * velocity.y;

		if (position.y < params.canvas.height) {
			velocity.y += params.dt * GRAVITY;
		}

		if (position.y >= params.canvas.height) {
			position.y = params.canvas.height;
			velocity.y = -velocity.y;
		}

		if (position.x <= 0 || position.x >= params.canvas.width) {
			velocity.x = -velocity.x;
		}
	}
}

class SpriteSystem extends ECS.System {
	constructor() {
		super([Position, Sprite]);
	}

	updateEntity(entity: ECS.Entity, params: any): void {
		const sprite = entity.getComponent(Sprite) as Sprite;
		const coords = entity.getComponent(Position) as Position;

		params.context.drawImage(
			sprite.image,
			0,
			0,
			sprite.width,
			sprite.height,
			coords.x - Math.round(sprite.width / 2),
			coords.y - Math.round(sprite.height),
			sprite.width,
			sprite.height
		);
	}
}

class BallSystem extends ECS.System {
	constructor() {
		super([Position, Ball]);
	}

	updateEntity(entity: ECS.Entity, params: any): void {
		const ball = entity.getComponent(Ball) as Ball;
		const coords = entity.getComponent(Position) as Position;

		params.context.beginPath();
		params.context.arc(coords.x, coords.y, ball.radius, 0, Math.PI * 2);
		params.context.fillStyle = "white";
		params.context.fill();
		params.context.closePath();
	}
}

const ecs = new ECS.ECS();

ecs.addSystem(new PhysicsSystem());
ecs.addSystem(new BallSystem());

for (let i = 0; i < 10; i++) {
	const entity = new ECS.Entity();
	entity.addComponent(new Velocity(randomFloat(-200, 200), 0));
	entity.addComponent(
		new Position(Math.floor(Math.random() * canvas.width), Math.floor(Math.random() * canvas.height))
	);
	//entity.addComponent(new Sprite(SPRITE, 16, 16));
	entity.addComponent(new Ball(Math.floor(randomFloat(10, 20))));
	ecs.addEntity(entity);
}

let dt: number = 0;
let then: number = 0;
function animate(now: number) {
	now *= 0.001;
	dt = now - then;
	then = now;
	if (dt > 1 / 30) dt = 1 / 30;

	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = "#000";
	context.fillRect(0, 0, canvas.width, canvas.height);

	ecs.update({ dt, canvas, context });
	requestAnimationFrame(animate);
}

animate(0);
