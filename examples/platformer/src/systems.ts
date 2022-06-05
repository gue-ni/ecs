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
	Light,
	Tile,
} from "./components";
import { Game, Shake, Sound, TILESIZE } from "./main";

const ON_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const jump_height = 32; // jump height
const jump_time = ON_MOBILE ? 0.4 : 0.33; // seconds

const JUMP = (2 * jump_height) / jump_time;
const GRAVITY = (2 * jump_height) / jump_time ** 2;
//console.log({ JUMP, GRAVITY });
//const JUMP = 200;
//const GRAVITY = ON_MOBILE ? 500 : 610;

const BOUNCE = 350;
const SPEED = 110;
const DASH_SPEED = 280;
const DASH_DURATION = 150;
const DRAG_FACTOR = 0.4;
const ACCELERATION = 20;
const BUTTONS = {
	LEFT: "ArrowLeft",
	RIGHT: "ArrowRight",
	UP: "ArrowUp",
	DOWN: "ArrowDown",
	JUMP: "KeyC",
	DASH: "KeyX",
};

export class LightSystem extends ECS.System {
	private canvas: HTMLCanvasElement;
	private context: CanvasRenderingContext2D;
	private readonly darkness: number = 0.4;

	constructor(canvas: HTMLCanvasElement) {
		super([Light, ECS.Position]);
		this.canvas = document.createElement("canvas");
		this.context = this.canvas.getContext("2d");
		this.canvas.width = canvas.width;
		this.canvas.height = canvas.height;
	}

	beforeAll = (entities: ECS.Entity[], params: ECS.UpdateParams) => {
		this.context.globalAlpha = 1.0;
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.fillStyle = `rgba(0, 0, 0, ${this.darkness})`;
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
		return entities;
	};

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const light = entity.getComponent(Light) as Light;
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		const shaker = params.shaker as Shake;

		// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation

		this.context.globalCompositeOperation = "destination-out";
		this.context.drawImage(
			light.image,
			light.offset.x,
			light.offset.y,
			light.width,
			light.height,
			Math.round(position.x + light.emitterSize.x / 2 - light.width / 2 + shaker.OFFSET_X),
			Math.round(position.y + light.emitterSize.y / 2 - light.height / 2 + shaker.OFFSET_X),
			light.width,
			light.height
		);
	}

	afterAll = (entities: ECS.Entity[], params: ECS.UpdateParams) => {
		this.context.globalCompositeOperation = "source-over";
		params.context.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height);
		return entities;
	};
}

export class ParticleSystem extends ECS.System {
	constructor() {
		super([ParticleEmitter, ECS.Position, Sprite, Controller]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const emitter = entity.getComponent(ParticleEmitter) as ParticleEmitter;
		const sprite = entity.getComponent(Sprite) as Sprite;
		const position = entity.getComponent(ECS.Position) as ECS.Position;
		const controller = entity.getComponent(Controller) as Controller;

		let p = new ECS.Vector(position.x + sprite.width / 2, position.y + sprite.height / 2);

		if (controller.dashing) {
			emitter.dash.active = true;
		} else if (controller.jumping) {
			emitter.jump.active = true;
		} else {
			emitter.dash.active = false;
			emitter.jump.active = false;
		}

		emitter.collect.update(p, params);
		emitter.dust.update(p, params);
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

		//console.log("goal", controller.goal.x)

		if (collider.south) {
			if (controller.goal.x > 0) {
				sprite.animations.play("run-right");
			} else if (controller.goal.x < 0) {
				sprite.animations.play("run-left");
			} else {
				sprite.animations.play(controller.last_dir > 0 ? "idle-right" : "idle-left");
			}
		} else {
			sprite.animations.play(controller.last_dir > 0 ? "jump-right" : "jump-left");
		}
	}
}

export class TileSystem extends ECS.System {
	private canvas: HTMLCanvasElement;
	private context: CanvasRenderingContext2D;
	private currentLevel: number = -1;

	constructor(canvas: HTMLCanvasElement) {
		super([Tile, ECS.Position]);
		this.canvas = document.createElement("canvas");
		this.context = this.canvas.getContext("2d");
		this.canvas.width = canvas.width;
		this.canvas.height = canvas.height;
	}

	beforeAll(entities: ECS.Entity[], params: ECS.UpdateParams): void {
		const game = params.game as Game;
		const shake = params.shaker as Shake;

		if (game.level != this.currentLevel) {
			this.currentLevel = game.level;

			this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.context.fillStyle = `rgba(0, 0, 0, 1.0)`;

			for (const entity of entities) {
				const tile = entity.getComponent(Tile) as Tile;
				const position = entity.getComponent(ECS.Position) as ECS.Position;
				this.context.drawImage(
					tile.image,
					tile.offset.x,
					tile.offset.y,
					tile.width,
					tile.height,
					Math.round(position.x),
					Math.round(position.y),
					tile.width,
					tile.height
				);
			}
		}
		// render tiles only once
		params.context.drawImage(this.canvas, shake.OFFSET_X, shake.OFFSET_Y, this.canvas.width, this.canvas.height);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {}
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

		const pos_x = Math.round(position.x + shaker.OFFSET_X);
		const pos_y = Math.round(position.y + shaker.OFFSET_Y);

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
				pos_x,
				pos_y,
				sprite.width,
				sprite.height
			);
		} else {
			params.context.fillStyle = sprite.color || "red";
			params.context.fillRect(pos_x - 0.5, pos_y - 0.5, sprite.width, sprite.height);
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
		const controller = entity.getComponent(Controller) as Controller;

		position.x += velocity.x * params.dt;
		position.y += velocity.y * params.dt;

		if (entity.getComponent(Gravity)) {
			if (controller && controller.holding) return;
			velocity.y += GRAVITY * params.dt;
		}
	}
}

export class CollectibleSystem extends ECS.System {
	time: number = 0;
	constructor() {
		super([Collectible, ECS.Position]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		/*
		this.time += params.dt;

		const position = entity.getComponent(ECS.Position) as ECS.Position;
		let s = Math.sin(this.time + entity.entityNumber);
		const value = s * 0.2;
		position.y += value;
		*/
	}
}

export class CollisionSystem extends ECS.CollisionSystem {
	onSolidCollision(
		collision: ECS.CollisionEvent,
		entity: ECS.Entity,
		target: ECS.Entity,
		params: ECS.UpdateParams
	): void {
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;
		const health = entity.getComponent(Health) as Health;
		const emitter = entity.getComponent(ParticleEmitter) as ParticleEmitter;

		// springs
		if (velocity && velocity.y > 10 && Math.abs(collision.contact_normal.y) > 0 && target.getComponent(Bouncy)) {
			velocity.y = -BOUNCE;
			const sprite = target.getComponent(Sprite) as Sprite;
			sprite.animations.play("bounce");
			(params.sound as Sound).play(100, 190, 0.5);
			return;
		}

		// spikes
		if (health && health.value != 0 && target.getComponent(Spike)) {
			(params.sound as Sound).play(200, 50, 0.5);
			(params.shaker as Shake).shake();

			target.removeComponent(Spike);
			entity.removeComponent(ECS.Velocity);

			const sprite = entity.getComponent(Sprite) as Sprite;
			if (sprite) sprite.visible = false;

			if (emitter) emitter.explosion.start_emitting();

			setTimeout(() => (health.value = 0), 700);
			return;
		}

		if (velocity && velocity.y > 10 && emitter && collision.contact_normal.y != 0) {
			emitter.dust.reset();
			emitter.dust.start_emitting();
			return;
		}
	}

	onTriggerCollision(
		collision: ECS.CollisionEvent,
		entity: ECS.Entity,
		target: ECS.Entity,
		params: ECS.UpdateParams
	): void {
		const emitter = entity.getComponent(ParticleEmitter) as ParticleEmitter;
		const collectible = target.getComponent(Collectible) as Collectible;

		if (collectible) {
			if (emitter) {
				emitter.collect.reset();
				emitter.collect.start_emitting();
			}

			switch (collectible.t) {
				case CollectibleType.DASH: {
					const controller = entity.getComponent(Controller) as Controller;
					controller.allowed_dashes++;
					this.ecs.removeEntity(target);

					break;
				}
			}
		}
	}
}

let waiting_for_respawn = false;

export class SpawnSystem extends ECS.System {
	constructor() {
		super([ECS.Position, Health, Sprite, ECS.Player]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		if (waiting_for_respawn) return;

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

			if (new_level < 0) {
				position.x = 0;
				velocity.x = 0;
				return;
			} else if (new_level > game.level_num) {
				position.x = params.canvas.width - sprite.width;
				velocity.x = 0;
				return;
			}

			waiting_for_respawn = true;

			Game.loadLevelFromImage(new_level)
				.then((json) => {
					game.clearLevel();
					game.level = new_level;
					game.data = json;
					console.log("loaded level", new_level);

					setTimeout(() => {
						game.createLevel(old_player_pos, old_player_vel);
						waiting_for_respawn = false;
					}, 100);
				})
				.catch((e) => {
					console.log("error", e);
					waiting_for_respawn = false;
					position.x = ECS.clamp(position.x, 0, params.canvas.width - sprite.width);
				});

			return;
		}

		if (health.value <= 0) {
			waiting_for_respawn = true;
			game.deaths++;

			game.clearLevel();
			setTimeout(() => {
				game.createLevel();
				waiting_for_respawn = false;
			}, 300);

			return;
		}
	}
}

export class MovementSystem extends ECS.System {
	constructor() {
		super([ECS.Input, ECS.Velocity, ECS.Collider, Controller]);
	}

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(ECS.Input) as ECS.Input;
		const controller = entity.getComponent(Controller) as Controller;
		const velocity = entity.getComponent(ECS.Velocity) as ECS.Velocity;
		const collider = entity.getComponent(ECS.Collider) as ECS.Collider;

		/*
		if (collider.east || collider.west) {
			controller.allowed_jumps = 1;
		}
		*/

		if (collider.south) {
			controller.allowed_jumps = 1;
			controller.allowed_dashes = 1;
			controller.coyote_time = 0.1;
		} else {
			if (controller.coyote_time > 0) controller.coyote_time -= params.dt;
		}

		const input_dir = new ECS.Vector();

		if (input.is_key_pressed(BUTTONS.RIGHT)) {
			controller.goal.x = input_dir.x = controller.last_dir = +1;
		} else if (input.is_key_pressed(BUTTONS.LEFT)) {
			controller.goal.x = input_dir.x = controller.last_dir = -1;
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

		if (
			(ON_MOBILE ? input.is_key_pressed(BUTTONS.JUMP, 0, true) : input.is_key_pressed(BUTTONS.JUMP)) &&
			!controller.dashing &&
			(collider.south || controller.coyote_time > 0) &&
			controller.allowed_jumps > 0
		) {
			velocity.y = -JUMP;
			controller.allowed_jumps--;

			if (ON_MOBILE) input.disable_until_key_release(BUTTONS.JUMP);

			controller.jumping = true;
			setTimeout(() => (controller.jumping = false), 50);
			(params.sound as Sound).play(150, 150, 0.5);

			return;
		}

		if (
			ON_MOBILE
				? input.is_key_pressed(BUTTONS.JUMP, 0, true) &&
				  controller.allowed_dashes > 0 &&
				  !collider.south &&
				  controller.coyote_time < 0
				: input.is_key_pressed(BUTTONS.DASH, 0, true) && controller.allowed_dashes > 0
		) {
			const x = Math.abs(input_dir.x) >= Math.abs(input_dir.y) ? input_dir.x : 0;
			const y = Math.abs(input_dir.y) >= Math.abs(input_dir.x) ? input_dir.y : 0;
			const dash = new ECS.Vector(Math.sign(x), Math.sign(y)).normalize().scalarMult(DASH_SPEED);

			if (dash.isNaN()) return;

			input.disable_until_key_release(BUTTONS.DASH);
			input.disable_until_key_release(BUTTONS.JUMP);

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

			return;
		}

		controller.current.x = ECS.approach(controller.goal.x, controller.current.x, params.dt * ACCELERATION);
		controller.current.y = ECS.approach(controller.goal.y, controller.current.y, params.dt * ACCELERATION);

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
