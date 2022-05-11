import * as ECS from "../../../src";
import {
	Sprite,
	Respawn,
	Health,
	Gravity,
	Bouncy,
	Spike,
	Collectible,
	CollectibleType,
	Controller,
} from "./components";
import { Factory } from "./factory";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

let paused = false;

const JUMP = 200;
const BOUNCE = 400;
const SPEED = 130;
const GRAVITY = 700;
const DASH_SPEED = 400;
const DASH_DURATION = 100;

const quadtree = new ECS.QuadTree(
	0,
	new ECS.Rectangle(new ECS.Vector(), new ECS.Vector(canvas.width, canvas.height)),
	2,
	5
);

const game = new ECS.FiniteStateMachine();
game.addState(new ECS.State("play"));
game.addState(new ECS.State("dead"));
game.addState(new ECS.State("loading"));

class Sound {
	_audioCtx: AudioContext;
	constructor() {
		let AudioContext = window.AudioContext;
		this._audioCtx = new AudioContext();
	}

	play(duration: number, frequency: number, volume: number = 1) {
		let oscillator = this._audioCtx.createOscillator();
		let gainNode = this._audioCtx.createGain();
		let v = 1;

		duration = duration / 1000;
		oscillator.frequency.value = frequency;
		gainNode.gain.setValueAtTime(volume, this._audioCtx.currentTime);
		gainNode.gain.linearRampToValueAtTime(volume, this._audioCtx.currentTime + duration * 0.8);
		gainNode.gain.linearRampToValueAtTime(0, this._audioCtx.currentTime + duration * 1);
		oscillator.connect(gainNode);
		gainNode.connect(this._audioCtx.destination);
		oscillator.type = "triangle";

		oscillator.start(this._audioCtx.currentTime);
		oscillator.stop(this._audioCtx.currentTime + duration);
	}
}

const sound = new Sound();

class SpriteSystem extends ECS.System {
	constructor() {
		super([Sprite, ECS.Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const sprite = entity.getComponent(Sprite) as Sprite;
		if (!sprite.visible) return;

		const position = entity.getComponent(ECS.Position) as ECS.Position;
		params.context.strokeStyle = sprite.color;
		params.context.strokeRect(Math.round(position.x) - 0.5, Math.round(position.y) - 0.5, sprite.w, sprite.h);
	}
}

class PhysicsSystem extends ECS.System {
	constructor() {
		super([ECS.Position, ECS.Velocity, Sprite]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const sprite = entity.getComponent(Sprite) as Sprite;
		//const acceleration = entity.getComponent(Acceleration) as Acceleration;
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;

		position.x += velocity.x * params.dt;
		position.y += velocity.y * params.dt;

		if (entity.getComponent(Gravity)) {
			velocity.y += GRAVITY * params.dt;
		}

		/*
		if (position.y > canvas.height - sprite.h) {
			position.y = canvas.height - sprite.h;
		}
		*/

		position.x = ECS.clamp(position.x, 0, params.canvas.width - sprite.w);
	}
}

class CollisionSystem extends ECS.CollisionSystem {
	customSolidResponse(collision: ECS.CollisionEvent, entity: ECS.Entity, target: ECS.Entity): void {
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;

		if (velocity && velocity.y > 10 && Math.abs(collision.contact_normal.y) > 0 && target.getComponent(Bouncy)) {
			velocity.y = -BOUNCE;

			sound.play(100, 190, 0.5);
		}
	}

	customResponse(collision: ECS.CollisionEvent, entity: ECS.Entity, target: ECS.Entity): void {
		const health = entity.getComponent(Health) as Health;

		if (health && health.value != 0 && target.getComponent(Spike)) {
			sound.play(200, 50, 0.5);
			health.value = 0;
		}

		const collectible = target.getComponent(Collectible) as Collectible;
		if (collectible) {
			switch (collectible.t) {
				case CollectibleType.DASH: {
					const controller = entity.getComponent(Controller) as Controller;
					controller.allowed_dashes = 1;
					ecs.removeEntity(target);
					break;
				}
			}
		}

		/*
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;
		if (velocity && velocity.vector.magnitude() > 200){
			let newVelocity = velocity.vector.clone()
			newVelocity.scalarMult(-0.5)
			velocity.x = newVelocity.x;
			velocity.y = newVelocity.y;
		}
		*/
	}
}

class HealthSystem extends ECS.System {
	constructor() {
		super([ECS.Position, ECS.Velocity, Respawn, Health]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const health = entity.getComponent(Health) as Health;
		const respawn = entity.getComponent(Respawn) as Respawn;
		const position = entity.getComponent(ECS.Position) as ECS.Position;

		if (position.y > canvas.height + TILESIZE * 3) {
			health.value = 0;
		}

		if (health.value <= 0) {
			if (!respawn.waiting) {
				const sprite = entity.getComponent(Sprite) as Sprite;
				sprite.visible = false;

				setTimeout(() => {
					const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;
					velocity.set(0, 0);
					position.set(respawn.x, respawn.y);
					health.value = 100;
					respawn.waiting = false;
					sprite.visible = true;
				}, 700);
			}
			respawn.waiting = true;
		}
	}
}

const BUTTONS = {
	LEFT: "ArrowLeft",
	RIGHT: "ArrowRight",
	UP: "ArrowUp",
	DOWN: "ArrowDown",
	JUMP: "ArrowUp",
	DASH: "Space",
};

class MovementSystem extends ECS.System {
	constructor() {
		super([ECS.Input, ECS.Velocity, ECS.Collider, Controller]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(ECS.Input) as ECS.Input;
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;
		const collider = entity.getComponent(ECS.Collider) as ECS.Collider;
		const controller = entity.getComponent(Controller) as Controller;

		if (collider.south) {
			controller.allowed_jumps = 2;
			controller.allowed_dashes = 1;
		}

		//console.log("jump count", controller.jump_count)

		const approach = (goal: number, current: number, delta: number) => {
			let diff = goal - current;

			if (diff > delta) {
				return current + delta;
			}
			if (diff < -delta) {
				return current - delta;
			}

			return goal;
		};

		if (input.is_key_pressed(BUTTONS.RIGHT)) {
			controller.goal.x = 1;
		} else if (input.is_key_pressed(BUTTONS.LEFT)) {
			controller.goal.x = -1;
		} else {
			//controller.goal.x = 0;
			if (collider.south) controller.goal.x = 0;
		}

		if (input.is_key_pressed(BUTTONS.UP)) {
			controller.goal.y = -1;
		} else if (input.is_key_pressed(BUTTONS.DOWN)) {
			controller.goal.y = 1;
		} else {
			controller.goal.y = 0;
		}

		const acceleration_factor = 20;
		controller.current.x = approach(controller.goal.x, controller.current.x, dt * acceleration_factor);
		controller.current.y = approach(controller.goal.y, controller.current.y, dt * acceleration_factor);

		if (
			input.is_key_pressed(BUTTONS.DASH) &&
			controller.allowed_dashes > 0 &&
			!controller.block_special &&
			!collider.south
		) {

			const dash_direction = new ECS.Vector(Math.sign(velocity.x), Math.sign(controller.current.y))
				.normalize()
				.scalarMult(DASH_SPEED);

			if (!dash_direction.isNaN()) {
				sound.play(150, 200, 0.5);

				controller.dashing = true;
				controller.allowed_dashes--;
				controller.block_special = true;

				velocity.set(dash_direction.x, dash_direction.y);

				entity.removeComponent(Gravity);

				setTimeout(() => {
					controller.block_special = false;
				}, 300);

				setTimeout(() => {
					velocity.set(0, 0);
					controller.goal.set(0, 0);
					controller.current.set(0, 0);
					controller.dashing = false;
				}, DASH_DURATION);

				setTimeout(() => {
					entity.addComponent(new Gravity());
				}, 200);

				return;
			} else {
				//console.log("dash failed", dash_direction);
			}
		}

		if (input.is_key_pressed(BUTTONS.JUMP, 300) && controller.allowed_jumps > 0 && !controller.block_special) {
			sound.play(150, 150, 0.5);

			velocity.y = -JUMP;
			controller.allowed_jumps--;
			controller.block_special = true;

			setTimeout(() => {
				controller.block_special = false;
			}, 300);
		}

		if (!controller.dashing) {
			velocity.x = SPEED * controller.current.x;
		}
	}
}

const ecs = new ECS.ECS();
ecs.addSystem(new ECS.InputSystem(canvas));
ecs.addSystem(new MovementSystem());
ecs.addSystem(new CollisionSystem(quadtree));
ecs.addSystem(new PhysicsSystem());
ecs.addSystem(new HealthSystem());
ecs.addSystem(new SpriteSystem());

const TILESIZE = 8;

const PLAYER_SIZE = 16;

fetch("assets/level-1.json")
	.then((res) => res.json())
	.then((json) => {
		for (const { x, y, type } of json) {
			let pos = new ECS.Vector(x * TILESIZE, canvas.height - y * TILESIZE - TILESIZE);

			switch (type) {
				case "player": {
					ecs.addEntity(Factory.createPlayer(pos));
					break;
				}

				case "tile": {
					ecs.addEntity(Factory.createTile(pos));
					break;
				}

				case "dash": {
					ecs.addEntity(Factory.createDash(pos));
					break;
				}

				case "bounce": {
					ecs.addEntity(Factory.createBounce(pos));
					break;
				}

				case "spike": {
					ecs.addEntity(Factory.createSpike(pos));
					break;
				}
			}
		}

		animate(0);
	});

const boxes = [
	[0, 3],
	[0, 4],
	[0, 5],
	[0, 6],
	[0, 7],
	[0, 8],
	[0, 2],
	[0, 1],
	[1, 1],
	[2, 1],
	[3, 1],
	[4, 1],
	[5, 1],
	[6, 1],
	[7, 1],
	[8, 1],
	[9, 1],
	[10, 1],
	[11, 1],
	[12, 1],
	[13, 1],
	[14, 1],
	[15, 1],
	[16, 1],
	[17, 1],
	[18, 1],
	[19, 1],
	[13, 4],
	[14, 4],
	[6, 6],
	[7, 6],
	[8, 6],
	[19, 2],
	[19, 3],
	[19, 4],
];

const fps: HTMLElement = document.getElementById("fps-display") as HTMLElement;

let dt: number = 0;
let then: number = 0;
let timer = 0;
function animate(now: number) {
	now *= 0.001;
	dt = now - then;
	then = now;

	if ((timer += dt) > 1) {
		timer = 0;
		fps.innerText = `${(1 / dt).toFixed(2)}`;
	}

	if (dt > 1 / 30) dt = 1 / 30;

	if (!paused) {
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = "#D3D3D3";
		context.fillRect(0, 0, canvas.width, canvas.height);

		ecs.update({ dt, canvas, context });
	}

	requestAnimationFrame(animate);
}

document.addEventListener("keydown", (e) => {
	if (e.code == "KeyP") paused = !paused;
});
