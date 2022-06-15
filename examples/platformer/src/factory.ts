import * as ECS from "../../../src";
import {
	Sprite,
	Light,
	Health,
	Gravity,
	Bouncy,
	Spike,
	Collectible,
	Controller,
	Tile,
	ParticleEmitter,
	Animation,
	Animations,
	Fragile,
} from "./components";
import { TILESIZE, SPRITESHEET } from "./main";

export class Factory {
	static createPlayer(pos: ECS.Vector, vel: ECS.Vector = new ECS.Vector()): ECS.Entity {
		const size = new ECS.Vector(16, 16);

		let old_sprite = new Sprite({
			width: size.x,
			height: size.y,
			image: SPRITESHEET,
			offset: new ECS.Vector(0 * 8, TILESIZE * 1),
			animations: new Animations([
				new Animation({ name: "idle-right", y: 0, repeat: true }),
				new Animation({ name: "idle-left", y: 1, repeat: true }),
				new Animation({ name: "jump-right", y: 2, repeat: true }),
				new Animation({ name: "jump-left", y: 3, repeat: true }),
				new Animation({ name: "run-right", y: 4, frames: 4, repeat: true }),
				new Animation({ name: "run-left", y: 5, frames: 4, repeat: true }),
			]),
		});

		let new_sprite = new Sprite({
			width: size.x,
			height: size.y,
			image: SPRITESHEET,
			offset: new ECS.Vector(TILESIZE * 8, TILESIZE * 1),
			animations: new Animations([
				new Animation({ name: "idle-right", y: 6, frames: 6, repeat: true }),
				new Animation({ name: "idle-left", y: 5, frames: 6, repeat: true }),

				new Animation({ name: "jump-left-down", y: 1, repeat: true }),
				new Animation({ name: "jump-left-up", y: 2, repeat: true }),

				new Animation({ name: "jump-right-down", y: 3, repeat: true }),
				new Animation({ name: "jump-right-up", y: 4, repeat: true }),

				new Animation({ name: "jump-right-float", y: 9, repeat: true }),
				new Animation({ name: "jump-left-float", y: 10, repeat: true }),

				new Animation({ name: "dash-right", y: 0, frames: 4, framerate: 16, repeat: true }),
				new Animation({ name: "dash-left", y: 0, x: 5, frames: 0, framerate: 16, repeat: true }),

				/*
				new Animation({ name: "jump-right", y: 3, repeat: true }),
				new Animation({ name: "jump-left", y: 4, repeat: true }),
				*/

				new Animation({ name: "run-right", y: 7, frames: 6, repeat: true }),
				new Animation({ name: "run-left", y: 8, frames: 6, repeat: true }),
			]),
		});

		return new ECS.Entity().addComponents(
			new_sprite,
			new Gravity(),
			new ParticleEmitter(),
			new Controller(),
			new Light({
				image: SPRITESHEET,
				width: 128,
				height: 128,
				emitterSize: new ECS.Vector(size.x, size.y),
				offset: new ECS.Vector(14 * TILESIZE, 27 * TILESIZE),
			}),
			new Health(),
			new ECS.Player(),
			new ECS.Input(),
			new ECS.Position(pos.x, pos.y),
			new ECS.Velocity(vel.x, vel.y),
			new ECS.Collider({ width: 6, height: size.y, offset: new ECS.Vector(5, 0) })
		);
	}

	

	static createPlatform(pos: ECS.Vector) {
		return new ECS.Entity().addComponents(
			new Tile({
				width: TILESIZE,
				height: TILESIZE,
				image: SPRITESHEET,
				offset: new ECS.Vector(1 * TILESIZE, 28 * TILESIZE),
			}),
			new ECS.Position(pos.x, pos.y),
			new ECS.Collider({
				width: TILESIZE,
				height: TILESIZE,
				colliderType: ECS.ColliderType.SOLID_FROM_TOP,
			})
		);
	}

	static createFragile(pos: ECS.Vector) {
		return new ECS.Entity().addComponents(
			new Sprite({
				width: TILESIZE,
				height: TILESIZE,
				image: SPRITESHEET,
				offset: new ECS.Vector(3 * TILESIZE, 28 * TILESIZE),
			}),
			new Fragile(),
			new ECS.Position(pos.x, pos.y),
			new ECS.Collider({
				width: TILESIZE,
				height: TILESIZE,
				colliderType: ECS.ColliderType.CUSTOM_SOLID,
			})
		);
	}

	static tileOffset(side: string): ECS.Vector {
		const offset = new ECS.Vector();
		switch (side) {
			case "up": {
				offset.set(ECS.randomInteger(1, 2) * TILESIZE, 0);
				break;
			}

			case "down": {
				offset.set(ECS.randomInteger(1, 2) * TILESIZE, 2 * TILESIZE);
				break;
			}

			case "top-left": {
				offset.set(0, 0);
				break;
			}

			case "top-right": {
				offset.set(TILESIZE * 3, 0);
				break;
			}

			case "bottom-left": {
				offset.set(0, 2 * TILESIZE);
				break;
			}

			case "bottom-right": {
				offset.set(TILESIZE * 3, 2 * TILESIZE);
				break;
			}

			case "left": {
				offset.set(0, TILESIZE * 1);
				break;
			}

			case "right": {
				offset.set(TILESIZE * 3, TILESIZE * 1);
				break;
			}

			case "middle": {
				//offset.set(TILESIZE * ECS.randomInteger(1,2), TILESIZE * 1);
				offset.set(TILESIZE * (Math.random() > 0.9 ? 2 : 1), TILESIZE * 1);
				break;
			}
		}

		return offset;
	}

	static spikeOffset(side: string): ECS.Vector {
		const offset = new ECS.Vector();

		switch (side) {
			case "up": {
				offset.set(0, 0);
				break;
			}

			case "down": {
				offset.set(1 * TILESIZE, 0);
				break;
			}
			case "left": {
				offset.set(2 * TILESIZE, 0);
				break;
			}
			case "right": {
				offset.set(3 * TILESIZE, 0);
				break;
			}
		}

		return offset;
	}

	static createTile(pos: ECS.Vector, side: string, biome: number = 2): ECS.Entity {
		const offset = Factory.tileOffset(side);
		offset.x += biome * 4 * TILESIZE;
		offset.y += 24 * TILESIZE;

		const e = new ECS.Entity().addComponents(
			new Tile({ width: TILESIZE, height: TILESIZE, image: SPRITESHEET, offset }),
			new ECS.Position(pos.x, pos.y)
		);

		if (side != "middle") {
			e.addComponent(
				new ECS.Collider({
					width: TILESIZE,
					height: TILESIZE,
					colliderType: ECS.ColliderType.CUSTOM_SOLID,
				})
			);
		}

		return e;
	}

	static createCoin(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity().addComponents(
			new Collectible(),
			new ECS.Position(pos.x, pos.y),
			new Light({
				image: SPRITESHEET,
				width: 16,
				height: 16,
				emitterSize: new ECS.Vector(TILESIZE, TILESIZE),
				offset: new ECS.Vector(10 * TILESIZE, 28 * TILESIZE),
			}),
			new Sprite({
				width: TILESIZE,
				height: TILESIZE,
				image: SPRITESHEET,
				offset: new ECS.Vector(0, 0),
				animations: new Animations([new Animation({ name: "spin", y: 0, repeat: true, frames: 6 })]),
			}),
			new ECS.Collider({ width: TILESIZE, height: TILESIZE, colliderType: ECS.ColliderType.CUSTOM })
		);
	}

	static createTrampoline(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity().addComponents(
			new Bouncy(0,-1),
			new ECS.Position(pos.x, pos.y),
			new Sprite({
				width: TILESIZE,
				height: TILESIZE,
				image: SPRITESHEET,
				offset: new ECS.Vector(0 * TILESIZE, 29 * TILESIZE),
				animations: new Animations([
					new Animation({ name: "idle", repeat: true, frames: 1, y: 0 }),
					new Animation({ name: "bounce", repeat: false, frames: 3, x: 0, y: 0 }),
				]),
			}),
			new ECS.Collider({
				width: TILESIZE,
				height: 4,
				colliderType: ECS.ColliderType.CUSTOM_SOLID,
				offset: new ECS.Vector(0, 4),
			})
		);
	}

	static createSpike(pos: ECS.Vector, side: string): ECS.Entity {
		const offset = Factory.spikeOffset(side);
		offset.y += 21 * TILESIZE;
		return new ECS.Entity().addComponents(
			new Spike(),
			new ECS.Position(pos.x, pos.y),
			new Tile({
				width: TILESIZE,
				height: TILESIZE,
				image: SPRITESHEET,
				offset: offset,
			}),
			new ECS.Collider({
				width: 2,
				height: 2,
				colliderType: ECS.ColliderType.CUSTOM_SOLID,
				offset: new ECS.Vector(4, 4),
			})
		);
	}

	static createEntity(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity();
	}
}
