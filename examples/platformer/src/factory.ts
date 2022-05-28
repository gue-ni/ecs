import * as ECS from "../../../src";
import {
	Sprite,
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
				new Animation({ name: "idle-left", y: 1, repeat: true }),
				new Animation({ name: "jump-right", y: 2, repeat: true }),
				new Animation({ name: "jump-left", y: 3, repeat: true }),
				new Animation({ name: "run-right", y: 7, frames: 6, repeat: true }),
				new Animation({ name: "run-left", y: 8, frames: 6, repeat: true }),
			]),
		});

		return new ECS.Entity().addComponents(
			new_sprite,
			new Gravity(),
			new ParticleEmitter(),
			new Controller(),
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
			new Tile(),
			new ECS.Position(pos.x, pos.y),
			new Sprite({
				width: TILESIZE,
				height: TILESIZE,
				image: SPRITESHEET,
				offset: new ECS.Vector(1 * TILESIZE, 28 * TILESIZE),
			}),
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
				offset.set(ECS.randomInteger(1,2) * TILESIZE, 2 * TILESIZE);
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
				offset.set(TILESIZE * 1, TILESIZE * 1);
				break;
			}
		}

		return offset;
	}

	static createTile(pos: ECS.Vector, side: string): ECS.Entity {
		const offset = Factory.tileOffset(side);
		offset.x += 6 * TILESIZE;
		offset.y += 24 * TILESIZE;

		const e = new ECS.Entity().addComponents(
			new Tile(),
			new ECS.Position(pos.x, pos.y),
			new Sprite({ width: TILESIZE, height: TILESIZE, image: SPRITESHEET, offset })
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

	static createBounce(pos: ECS.Vector): ECS.Entity {
		console.log("create bounce");
		return new ECS.Entity().addComponents(
			new Bouncy(),
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

	static createSpike(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity().addComponents(
			new Spike(),
			new ECS.Position(pos.x, pos.y),
			new Sprite({
				width: TILESIZE,
				height: TILESIZE,
				image: SPRITESHEET,
				offset: new ECS.Vector(0, 21 * TILESIZE),
			}),
			new ECS.Collider({
				width: TILESIZE,
				height: 2,
				colliderType: ECS.ColliderType.CUSTOM_SOLID,
				offset: new ECS.Vector(0, 6),
			})
		);
	}

	static createEntity(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity();
	}
}
