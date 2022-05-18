import * as ECS from "../../../src";
import {
	Sprite,
	Health,
	Gravity,
	Bouncy,
	Spike,
	Collectible,
	CollectibleType,
	Controller,
	ParticleEmitter,
} from "./components";

import { Game, Shake, Sound } from "./main";

const JUMP = 200;
const BOUNCE = 400;
const SPEED = 110;
const GRAVITY = 650;
const DASH_SPEED = 300;
const DASH_DURATION = 150;
const DRAG_FACTOR = 0.4;
const ACCELERATION = 40;
const BUTTONS = {
	LEFT: "ArrowLeft",
	RIGHT: "ArrowRight",
	UP: "ArrowUp",
	DOWN: "ArrowDown",
	JUMP: "ArrowUp",
	DASH: "Space",
};

export class ParticleSystem extends ECS.System {
	constructor() {
		super([ParticleEmitter, ECS.Position, Sprite, Controller]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const emitter = entity.getComponent(ParticleEmitter) as ParticleEmitter;
		const sprite = entity.getComponent(Sprite) as Sprite;
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		const controller = entity.getComponent(Controller) as Controller;

		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;

		let p = new ECS.Vector(position.x + sprite.width / 2, position.y + sprite.height / 2);

		if (controller.dashing) {
			emitter.dash.active = true;
			//} else if (!controller.dashing && velocity && velocity.vector.magnitude() > 100) {
		} else if (controller.jumping) {
			emitter.jump.active = true;
		} else {
			emitter.dash.active = false;
			emitter.jump.active = false;
		}

		emitter.dash.update(p, params);
		emitter.jump.update(p, params);
		emitter.explosion.update(p, params);
	}
}

export class AnimationSystem extends ECS.System {
	constructor() {
		super([Sprite, Controller, ECS.Collider]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const sprite = entity.getComponent(Sprite) as Sprite;
		if (!sprite.animations) return;

		const controller = entity.getComponent(Controller) as Controller;
		const collider = entity.getComponent(ECS.Collider) as ECS.Collider;

		if (collider.south) {
			if (controller.goal.x > 0) {
				sprite.animations.play("run-right");
			} else if (controller.goal.x < 0) {
				sprite.animations.play("run-left");
			} else {
				sprite.animations.play("idle-right");
			}
		} else {
			if (controller.goal.x > 0) {
				sprite.animations.play("jump-right");
			} else {
				sprite.animations.play("jump-left");
			}
		}
	}
}

export class SpriteSystem extends ECS.System {
	constructor() {
		super([Sprite, ECS.Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const sprite = entity.getComponent(Sprite) as Sprite;
		if (!sprite.visible) return;

		const position = entity.getComponent(ECS.Position) as ECS.Position;
		const shaker = params.shaker as Shake;

		const x = Math.round(position.x + shaker.OFFSET_X);
		const y = Math.round(position.y + shaker.OFFSET_Y);

		if (sprite.image) {
			let frame_x = 0;
			let frame_y = 0;

			if (sprite.animations) {
				sprite.animations.update(params.dt);
				frame_x = sprite.animations.frameX;
				frame_y = sprite.animations.frameY;
			}

			params.context.drawImage(
				sprite.image,
				sprite.offset.x + frame_x * sprite.width,
				sprite.offset.y + frame_y * sprite.height,
				sprite.width,
				sprite.height,
				x,
				y,
				sprite.width,
				sprite.height
			);
		} else {
			params.context.fillStyle = sprite.color;
			params.context.fillRect(x - 0.5, y - 0.5, sprite.width, sprite.height);
		}
	}
}

export class PhysicsSystem extends ECS.System {
	constructor() {
		super([ECS.Position, ECS.Velocity]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;

		position.x += velocity.x * params.dt;
		position.y += velocity.y * params.dt;

		/*
		velocity.x += (forces.x / forces.mass) * params.dt;
		velocity.y += (forces.y / forces.mass) * params.dt;

		const G = 600;
		forces.set(0, entity.getComponent(Gravity) ? G * forces.mass : 0);
		*/

		if (entity.getComponent(Gravity)) velocity.y += GRAVITY * params.dt;
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
		const health = entity.getComponent(Health) as Health;

		if (velocity && velocity.y > 10 && Math.abs(collision.contact_normal.y) > 0 && target.getComponent(Bouncy)) {
			velocity.y = -BOUNCE;
			(params.sound as Sound).play(100, 190, 0.5);
		}

		if (health && health.value != 0 && target.getComponent(Spike)) {
			(params.sound as Sound).play(200, 50, 0.5);

			target.removeComponent(Spike);

			entity.removeComponent(Gravity);
			entity.removeComponent(ECS.Velocity);

			const sprite = entity.getComponent(Sprite) as Sprite;
			if (sprite) sprite.visible = false;

			const emitter = entity.getComponent(ParticleEmitter) as ParticleEmitter;
			if (emitter) emitter.explosion.active = true;

			(params.shaker as Shake).shake();

			setTimeout(() => (health.value = 0), 700);
		}
	}

	customResponse(
		collision: ECS.CollisionEvent,
		entity: ECS.Entity,
		target: ECS.Entity,
		params: ECS.UpdateParams
	): void {
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
	}
}

let waiting = false;

const pixel = (x: number, y: number, image: ImageData) => {
	let index = y * (image.width * 4) + x * 4;
	let r = image.data[index + 0];
	let g = image.data[index + 1];
	let b = image.data[index + 2];
	let a = image.data[index + 3];
	return [r, g, b, a];
};

export class SpawnSystem extends ECS.System {
	constructor() {
		super([ECS.Position, Health, Sprite, ECS.Player]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		if (waiting) return;

		const health = entity.getComponent(Health) as Health;
		const sprite = entity.getComponent(Sprite) as Sprite;
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;

		if (position.y > params.canvas.height + 16 * 3) {
			health.value = 0;
			return;
		}

		const game = params.game as Game;

		if (position.x + sprite.width > params.canvas.width || position.x < 0) {
			const old_player_pos = position.vector.copy();
			const old_player_vel = velocity.vector.copy();

			let new_level = 0;
			if (position.x > 0) {
				new_level = game.level + 1;
				old_player_pos.x = 0;
			} else {
				new_level = game.level - 1;
				old_player_pos.x = params.canvas.width - sprite.width;
			}

			if (new_level == 0) {
				position.x = 0;
				velocity.x = 0;
				return;
			} else if (new_level > game.max_level) {
				position.x = params.canvas.width - sprite.width;
				velocity.x = 0;
				return;
			}

			waiting = true;

			Game.fetchLevelData(`assets/level-${new_level}.png`)
				.then((json) => {
					game.clearLevel();
					game.level = new_level;
					game.data = json;
					console.log("loaded level", new_level);

					setTimeout(() => {
						game.createLevel(old_player_pos, old_player_vel);
						waiting = false;
					}, 100);
				})
				.catch((e) => {
					console.log("error", e);
					//alert(`ERROR: failed to load level ${level}!`);
					waiting = false;
					position.x = ECS.clamp(position.x, 0, params.canvas.width - sprite.width);
				});

			return;
		}

		if (health.value <= 0) {
			console.log("respawn");
			waiting = true;
			game.clearLevel();
			setTimeout(() => {
				game.createLevel();
				waiting = false;
			}, 700);

			return;
		}
	}
}

/*
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

		if (input.is_key_pressed(BUTTONS.RIGHT, { reset: true })) {
			dir.x = 1;
		} else if (input.is_key_pressed(BUTTONS.LEFT, { reset: true })) {
			dir.x = -1;
		} else if (input.is_key_pressed(BUTTONS.UP, {})) {
			dir.y = -1;
		} else if (input.is_key_pressed(BUTTONS.DOWN, {})) {
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

		if (input.is_key_pressed(BUTTONS.JUMP, { delay: 300 }) && controller.allowed_jumps > 0) {
			(params.sound as Sound).play(100, 190, 0.5);
			velocity.y = 0;
			forces.y = -150000;
			controller.allowed_jumps--;
		}

		if (input.is_key_pressed(BUTTONS.DASH, {}) && controller.allowed_dashes > 0 && !collider.south) {
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
*/

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

		const input_dir = new ECS.Vector();

		if (input.is_key_pressed(BUTTONS.RIGHT)) {
			controller.goal.x = input_dir.x = 1;
		} else if (input.is_key_pressed(BUTTONS.LEFT)) {
			controller.goal.x = input_dir.x = -1;
		} else {
			if (collider.south) controller.goal.x = 0;
		}

		if (input.is_key_pressed(BUTTONS.UP)) {
			controller.goal.y = input_dir.y = -1;
		} else if (input.is_key_pressed(BUTTONS.DOWN)) {
			controller.goal.y = input_dir.y = 1;
		} else {
			controller.goal.y = 0;
		}

		controller.current.x = ECS.approach(controller.goal.x, controller.current.x, params.dt * ACCELERATION);
		controller.current.y = ECS.approach(controller.goal.y, controller.current.y, params.dt * ACCELERATION);

		if (
			input.is_key_pressed(BUTTONS.DASH) &&
			controller.allowed_dashes > 0 &&
			!collider.south &&
			controller.dash_allowed
		) {
			const x = Math.abs(input_dir.x) > Math.abs(input_dir.y) ? input_dir.x : 0;
			const y = Math.abs(input_dir.y) > Math.abs(input_dir.x) ? input_dir.y : 0;
			const dash = new ECS.Vector(Math.sign(x), Math.sign(y)).normalize().scalarMult(DASH_SPEED);

			if (!dash.isNaN()) {
				(params.sound as Sound).play(150, 200, 0.5);
				(params.shaker as Shake).shake();

				controller.dashing = true;
				controller.allowed_dashes--;
				velocity.set(dash.x, dash.y);

				entity.removeComponent(Gravity);

				setTimeout(() => {
					velocity.set(0, 0);
					controller.goal.set(0, 0);
					controller.current.set(0, 0);
					controller.dashing = false;
					entity.addComponent(new Gravity());
				}, DASH_DURATION);

				controller.dash_allowed = false;
				setTimeout(() => (controller.dash_allowed = true), 300);
				return;
			}
		}

		if (
			input.is_key_pressed(BUTTONS.JUMP, 300) &&
			controller.allowed_jumps > 0 &&
			!controller.dashing &&
			collider.south
		) {
			(params.sound as Sound).play(150, 150, 0.5);

			velocity.y = -JUMP;
			controller.allowed_jumps--;

			controller.jumping = true;
			setTimeout(() => (controller.jumping = false), 50);

			controller.dash_allowed = false;
			setTimeout(() => (controller.dash_allowed = true), 150);
		}

		if (!controller.dashing) {
			if (!collider.south && input_dir.x == 0 && input_dir.y == 0) {
				// simulate air resistance
				velocity.x = velocity.x * DRAG_FACTOR;
			} else {
				velocity.x = SPEED * controller.current.x;
			}
		}
	}
}
