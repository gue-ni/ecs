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

const TILESIZE = 8;

const TILE = new Image();
TILE.src = "assets/tile.png";

const SPIKE = new Image();
SPIKE.src = "assets/spikes.png";

const PLATFORM = new Image();
PLATFORM.src = "assets/platform.png";

const COIN = new Image();
COIN.src = "assets/coin.png";

const CHARACTER = new Image();
CHARACTER.src = "assets/character.png";

export class Factory {
	static createPlayer(pos: ECS.Vector, vel: ECS.Vector = new ECS.Vector()): ECS.Entity {
		const size = new ECS.Vector(16, 16);
		return new ECS.Entity().addComponents(
			new Sprite({
				width: size.x,
				height: size.y,
				image: CHARACTER,
				animations: new Animations([
					new Animation({ name: "idle-right", row: 0, repeat: true }),
					new Animation({ name: "idle-left", row: 1, repeat: true }),
					new Animation({ name: "jump-right", row: 2, repeat: true }),
					new Animation({ name: "jump-left", row: 3, repeat: true }),
					new Animation({ name: "run-right", row: 4, frames: 4, repeat: true }),
					new Animation({ name: "run-left", row: 5, frames: 4, repeat: true }),
				]),
			}),
			new Gravity(),
			new ParticleEmitter(),
			new Controller(),
			new Health(),
			new ECS.Player(),
			new ECS.Input(),
			new ECS.Position(pos.x, pos.y),
			new ECS.Velocity(vel.x, vel.y),
			new ECS.Collider({ width: 8, height: size.y, offset: new ECS.Vector(4, 0) })
		);
	}

	static createPlatform(pos: ECS.Vector) {
		return new ECS.Entity().addComponents(
			new Tile(),
			new ECS.Position(pos.x, pos.y),
			new Sprite({ width: TILESIZE, height: TILESIZE, image: PLATFORM }),
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
				offset.set(1 * TILESIZE, 0);
				break;
			}

			case "down": {
				offset.set(1 * TILESIZE, 2 * TILESIZE);
				break;
			}

			case "top-left": {
				offset.set(0, 0);
				break;
			}

			case "top-right": {
				offset.set(TILESIZE * 2, 0);
				break;
			}

			case "bottom-left": {
				offset.set(0, 2 * TILESIZE);
				break;
			}

			case "bottom-right": {
				offset.set(TILESIZE * 2, 2 * TILESIZE);
				break;
			}

			case "left": {
				offset.set(0, TILESIZE * 1);
				break;
			}

			case "right": {
				offset.set(TILESIZE * 2, TILESIZE * 1);
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
		let offset = Factory.tileOffset(side);

		//console.log("create tile", side, offset.x, offset.y);

		const e = new ECS.Entity().addComponents(
			new Tile(),
			new ECS.Position(pos.x, pos.y),
			new Sprite({ width: TILESIZE, height: TILESIZE, image: TILE, offset })
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

	static createDash(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity().addComponents(
			new Collectible(),
			new ECS.Position(pos.x, pos.y),
			new Sprite({
				width: TILESIZE,
				height: TILESIZE,
				image: COIN,
				animations: new Animations([new Animation({ name: "spin", row: 0, repeat: true, frames: 6 })]),
			}),
			new ECS.Collider({ width: TILESIZE, height: TILESIZE, colliderType: ECS.ColliderType.CUSTOM })
		);
	}

	static createBounce(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity().addComponents(
			new Bouncy(),
			new ECS.Position(pos.x, pos.y),
			new Sprite({ width: TILESIZE, height: TILESIZE, color: "turquoise" }),
			new ECS.Collider({ width: TILESIZE, height: TILESIZE, colliderType: ECS.ColliderType.CUSTOM_SOLID })
		);
	}

	static createSpike(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity().addComponents(
			new Spike(),
			new ECS.Position(pos.x, pos.y),
			new Sprite({ width: TILESIZE, height: TILESIZE, image: SPIKE, offset: new ECS.Vector(1 * TILESIZE, 0) }),
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
