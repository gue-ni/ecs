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
	Tile,
	Forces,
} from "./components";

import { Game, Sound } from "./main";

const JUMP = 200;
const BOUNCE = 400;
const SPEED = 110;
const GRAVITY = 700;
const DASH_SPEED = 400;
const DASH_DURATION = 200;

const BUTTONS = {
	LEFT: "ArrowLeft",
	RIGHT: "ArrowRight",
	UP: "ArrowUp",
	DOWN: "ArrowDown",
	JUMP: "KeyC",
	DASH: "KeyX",
};

export class SpriteSystem extends ECS.System {
	constructor() {
		super([Sprite, ECS.Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const sprite = entity.getComponent(Sprite) as Sprite;
		if (!sprite.visible) return;

		const position = entity.getComponent(ECS.Position) as ECS.Position;
		params.context.fillStyle = sprite.color;
		params.context.fillRect(Math.round(position.x) - 0.5, Math.round(position.y) - 0.5, sprite.w, sprite.h);
	}
}

export class PhysicsSystem extends ECS.System {
	constructor() {
		super([ECS.Position, ECS.Velocity, Sprite, Forces]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const sprite = entity.getComponent(Sprite) as Sprite;
		const forces = entity.getComponent(Forces) as Forces;
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;

		position.x += velocity.x * params.dt;
		position.y += velocity.y * params.dt;

		velocity.x += (forces.x / forces.mass) * params.dt;
		velocity.y += (forces.y / forces.mass) * params.dt;

		const G = 700;
		/*
		if (entity.getComponent(Gravity)) {
			velocity.y += G * params.dt;
		}
		*/

		forces.set(0, entity.getComponent(Gravity) ? G * forces.mass : 0);

		/*
		if (entity.getComponent(Gravity)) {
			velocity.y += GRAVITY * params.dt;
		}
		*/

		/*
		if (position.y > canvas.height - sprite.h) {
			position.y = canvas.height - sprite.h;
		}
		*/

		position.x = ECS.clamp(position.x, 0, params.canvas.width - sprite.w);
	}
}

export class CollisionSystem extends ECS.CollisionSystem {
	customSolidResponse(
		collision: ECS.CollisionEvent,
		entity: ECS.Entity,
		target: ECS.Entity,
		params: ECS.UpdateParams
	): void {
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;

		if (velocity && velocity.y > 10 && Math.abs(collision.contact_normal.y) > 0 && target.getComponent(Bouncy)) {
			velocity.y = -BOUNCE;
			(params.sound as Sound).play(100, 190, 0.5);
		}

		if (velocity && velocity.y > 0 && Math.abs(collision.contact_normal.y) > 0 && target.getComponent(Tile)) {
			//(params.sound as Sound).play(100, 100, 0.5);
		}
	}

	customResponse(
		collision: ECS.CollisionEvent,
		entity: ECS.Entity,
		target: ECS.Entity,
		params: ECS.UpdateParams
	): void {
		const health = entity.getComponent(Health) as Health;

		if (health && health.value != 0 && target.getComponent(Spike)) {
			(params.sound as Sound).play(200, 50, 0.5);
			health.value = 0;
		}

		const collectible = target.getComponent(Collectible) as Collectible;
		if (collectible) {
			switch (collectible.t) {
				case CollectibleType.DASH: {
					const controller = entity.getComponent(Controller) as Controller;
					controller.allowed_dashes = 1;
					this.ecs.removeEntity(target);
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

export class HealthSystem extends ECS.System {
	constructor() {
		super([ECS.Position, ECS.Velocity, Respawn, Health]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const health = entity.getComponent(Health) as Health;
		const respawn = entity.getComponent(Respawn) as Respawn;
		const position = entity.getComponent(ECS.Position) as ECS.Position;

		if (position.y > params.canvas.height + 16 * 3) {
			health.value = 0;
		}

		if (health.value <= 0) {
			if (!respawn.waiting) {
				const sprite = entity.getComponent(Sprite) as Sprite;
				sprite.visible = false;

				let game = params.game as Game;
				game.clearLevel();

				setTimeout(() => {
					game.loadLevel();
				}, 700);

				/*
				setTimeout(() => {
					const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;
					velocity.set(0, 0);
					position.set(respawn.x, respawn.y);
					health.value = 100;
					respawn.waiting = false;
					sprite.visible = true;
				}, 700);
				*/
			}
			respawn.waiting = true;
		}
	}
}

export class ForceMovement extends ECS.System {
	constructor() {
		super([ECS.Input, ECS.Velocity, ECS.Collider, Controller, Forces]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(ECS.Input) as ECS.Input;
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;
		const collider = entity.getComponent(ECS.Collider) as ECS.Collider;
		const controller = entity.getComponent(Controller) as Controller;
		const forces = entity.getComponent(Forces) as Forces;

		const dir = new ECS.Vector();

		if (input.is_key_pressed(BUTTONS.RIGHT)) {
			dir.x = 1;
		} else if (input.is_key_pressed(BUTTONS.LEFT)) {
			dir.x = -1;
		} else if (input.is_key_pressed(BUTTONS.UP)) {
			dir.y = -1;
		} else if (input.is_key_pressed(BUTTONS.DOWN)) {
			dir.y = 1;
		}

		const acceleration = 200;
		const decceleration = 50;

		let targetSpeed = dir.x * SPEED;

		let speedDiff = targetSpeed - velocity.x;

		let accelRate = Math.abs(targetSpeed) > 0.01 ? acceleration : decceleration;

		let velPower = 0.9;

		if (dir.x != 0) {
			const movement = Math.pow(Math.abs(speedDiff) * accelRate, velPower) * Math.sign(speedDiff);
			forces.x += movement;
		} else {
			const drag_coefficient = collider.south ? 5 : 0.01;
			const drag = Math.sign(velocity.x) * Math.pow(velocity.x, 2) * drag_coefficient;
			forces.x -= drag;
		}

		if (collider.south) {
			controller.allowed_jumps = 1;
			controller.allowed_dashes = 1;
		}

		if (input.is_key_pressed(BUTTONS.JUMP, 300) && controller.allowed_jumps > 0) {
			(params.sound as Sound).play(100, 190, 0.5);
			velocity.y = 0;
			forces.y = -150000;
			controller.allowed_jumps--;
		}

		if (input.is_key_pressed(BUTTONS.DASH) && controller.allowed_dashes > 0 && !collider.south) {
			const dash_force = new ECS.Vector(Math.sign(dir.x), Math.sign(dir.y)).normalize().scalarMult(200_000);

			if (!dash_force.isNaN()) {
				(params.sound as Sound).play(200, 220, 1.5);
				entity.removeComponent(Gravity);

				controller.dashing = true;
				controller.allowed_dashes--;

				velocity.set(0, 0);
				forces.set(dash_force.x, dash_force.y);

				setTimeout(() => {
					forces.set(0, 0);
					velocity.set(0, 0);
					controller.goal.set(0, 0);
					controller.current.set(0, 0);
					controller.dashing = false;
					entity.addComponent(new Gravity());
				}, DASH_DURATION);
				return;
			}
		}
	}
}

export class MovementSystem extends ECS.System {
	constructor() {
		super([ECS.Input, ECS.Velocity, ECS.Collider, Controller]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(ECS.Input) as ECS.Input;
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;
		const collider = entity.getComponent(ECS.Collider) as ECS.Collider;
		const controller = entity.getComponent(Controller) as Controller;

		if (collider.south) {
			controller.allowed_jumps = 1;
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
			if (collider.south) controller.goal.x = 0;
		}

		if (input.is_key_pressed(BUTTONS.UP)) {
			controller.goal.y = -1;
		} else if (input.is_key_pressed(BUTTONS.DOWN)) {
			controller.goal.y = 1;
		} else {
			controller.goal.y = 0;
		}

		const acceleration_factor = 50;
		controller.current.x = approach(controller.goal.x, controller.current.x, params.dt * acceleration_factor);
		controller.current.y = approach(controller.goal.y, controller.current.y, params.dt * acceleration_factor);

		if (input.is_key_pressed(BUTTONS.DASH) && controller.allowed_dashes > 0 && !collider.south) {
			const dash_direction = new ECS.Vector(Math.sign(controller.current.x), Math.sign(controller.current.y))
				.normalize()
				.scalarMult(300);

			if (!dash_direction.isNaN()) {
				(params.sound as Sound).play(150, 200, 0.5);

				controller.dashing = true;
				controller.allowed_dashes--;

				velocity.set(dash_direction.x, dash_direction.y);

				entity.removeComponent(Gravity);

				setTimeout(() => {
					velocity.set(0, 0);
					controller.goal.set(0, 0);
					controller.current.set(0, 0);
					controller.dashing = false;
				}, 150);

				setTimeout(() => {
					entity.addComponent(new Gravity());
				}, 200);

				return;
			} else {
				//console.log("dash failed", dash_direction);
			}
		}

		if (input.is_key_pressed(BUTTONS.JUMP, 300) && controller.allowed_jumps > 0) {
			(params.sound as Sound).play(150, 150, 0.5);

			velocity.y = -JUMP;
			controller.allowed_jumps--;
		}

		if (!controller.dashing) {
			velocity.x = SPEED * controller.current.x;
		}
	}
}
