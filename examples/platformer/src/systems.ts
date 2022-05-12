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
} from "./components";

import { Sound } from "./main";

const JUMP = 200;
const BOUNCE = 400;
const SPEED = 110;
const GRAVITY = 700;
const DASH_SPEED = 400;
const DASH_DURATION = 100;

const BUTTONS = {
	LEFT: "ArrowLeft",
	RIGHT: "ArrowRight",
	UP: "ArrowUp",
	DOWN: "ArrowDown",
	JUMP: "ArrowUp",
	DASH: "Space",
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
		super([ECS.Position, ECS.Velocity, Sprite]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const sprite = entity.getComponent(Sprite) as Sprite;
		//const acceleration = entity.getComponent(Acceleration) as Acceleration;
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;


		position.x += velocity.x * params.dt;
		position.y += velocity.y * params.dt;


		let G = 700;
		velocity.y += G * params.dt;

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

		/*
		if (target.getComponent(Tile)) {
			if (Math.abs(collision.contact_normal.x) > 0 && Math.abs(velocity.x) > 10) {
				console.log("x collision", velocity.x);
				velocity.x += 200 * collision.contact_normal.x;
			}
		}
		*/
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

		const acceleration_factor = 50;
		controller.current.x = approach(controller.goal.x, controller.current.x, params.dt * acceleration_factor);
		controller.current.y = approach(controller.goal.y, controller.current.y, params.dt * acceleration_factor);

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
				(params.sound as Sound).play(150, 200, 0.5);

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
			(params.sound as Sound).play(150, 150, 0.5);

			velocity.y = -JUMP;
			controller.allowed_jumps--;
			controller.block_special = true;

			setTimeout(() => {
				controller.block_special = false;
			}, 300);
		}

		if (!controller.dashing && collider.south) {
		//if (!controller.dashing) {
			velocity.x = SPEED * controller.current.x;
		}
	}
}
