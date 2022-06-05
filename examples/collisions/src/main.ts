import * as ECS from "../../../lib";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

let paused = false;
const SPEED = 200;
const SIZE = 50;
const NUM = 5;

const quadtree = new ECS.QuadTree(
	0,
	new ECS.Rectangle(new ECS.Vector(), new ECS.Vector(canvas.width, canvas.height)),
	2,
	5
);

class Sprite extends ECS.Component {
	width: number;
	height: number;
	color: string;

	constructor(w: number, h: number, color: string = "white") {
		super();
		this.width = w;
		this.height = h;
		this.color = color;
	}
}

class SpriteSystem extends ECS.System {
	constructor() {
		super([Sprite, ECS.Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const rect = entity.getComponent(Sprite) as Sprite;
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		params.context.strokeStyle = rect.color;
		params.context.strokeRect(position.x, position.y, rect.width, rect.height);
	}
}

export class PhysicsSystem extends ECS.System {
	constructor() {
		super([ECS.Position, ECS.Velocity]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;
		const sprite = entity.getComponent(Sprite) as Sprite;

		position.x += velocity.x * params.dt;
		position.y += velocity.y * params.dt;

		if (position.x > canvas.width) position.x = -sprite.width;
		if (position.y > canvas.height) position.y = -sprite.height;
		if (position.x < -sprite.width) position.x = canvas.width;
		if (position.y < -sprite.height) position.y = canvas.height;
	}
}

class CollisionSystem extends ECS.CollisionSystem {
	onTriggerCollision(
		collision: ECS.CollisionEvent,
		entity: ECS.Entity,
		target: ECS.Entity,
		params: ECS.UpdateParams
	): void {
		const sprite = entity.getComponent(Sprite) as Sprite;
		sprite.color = "red";
		/*
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;
		velocity.x = -velocity.x
		velocity.y = -velocity.y
		*/
	}
}

const ecs = new ECS.ECS();
ecs.addSystem(new CollisionSystem(quadtree));
ecs.addSystem(new PhysicsSystem());
ecs.addSystem(new SpriteSystem());

ecs.addEntity(
	new ECS.Entity().addComponents(
		new ECS.Position(canvas.width / 2, canvas.height / 2),
		new Sprite(100, 100, "blue"),
		new ECS.Collider({ width: 100, height: 100, colliderType: ECS.ColliderType.SOLID })
	)
);

for (let i = 0; i < NUM; i++) {
	const entity = new ECS.Entity();
	const v = new ECS.Vector().random_unit_vector().scalarMult(SPEED);
	entity.addComponent(new ECS.Velocity(v.x, v.y));

	const w = SIZE;
	entity.addComponents(
		new ECS.Position(ECS.randomInteger(0, canvas.width - w), ECS.randomInteger(0, canvas.height - w)),
		new Sprite(w, w, "green"),
		new ECS.Collider({ width: w, height: w, colliderType: ECS.ColliderType.CUSTOM })
	);

	ecs.addEntity(entity);
}

document.addEventListener("keydown", (e) => {
	if (e.code == "KeyP") {
		paused = !paused;
	}
});


let dt: number = 0;
let then: number = 0;
function animate(now: number) {
	now *= 0.001;
	dt = now - then;
	then = now;
	if (dt > 1 / 30) dt = 1 / 30;

	if (!paused) {
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = "#A0A0A0";
		context.fillRect(0, 0, canvas.width, canvas.height);

		ecs.update({ dt, canvas, context });
	}

	requestAnimationFrame(animate);
}

animate(0);
