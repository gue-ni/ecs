import * as ECS from "../../../src";
import { Sprite, Health, Gravity, Bouncy, Spike, Collectible, Controller, Tile, ParticleEmitter } from "./components";

const TILESIZE = 8;

const TILE = new Image();
TILE.src = "assets/tile.png";

const SPIKE = new Image();
SPIKE.src = "assets/spikes.png";

const CHARACTER = new Image();
CHARACTER.src = "assets/character.png";

export class Factory {
	static createPlayer(pos: ECS.Vector, vel: ECS.Vector = new ECS.Vector()): ECS.Entity {
		const size = new ECS.Vector(16, 16);
		return new ECS.Entity().addComponents(
			new Sprite({ width: size.x, height: size.y, image: CHARACTER }),
			new Gravity(),
			new ParticleEmitter(),
			new Controller(),
			new Health(),
			new ECS.Player(),
			new ECS.Input(),
			new ECS.Position(pos.x, pos.y),
			new ECS.Velocity(vel.x, vel.y),
			new ECS.Collider({ width: 8, height: size.y, offset: new ECS.Vector(4,0) })
		);
	}

	static createTile(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity().addComponents(
			new Tile(),
			new ECS.Position(pos.x, pos.y),
			new Sprite({ width: TILESIZE, height: TILESIZE, image: TILE }),
			new ECS.Collider({
				width: TILESIZE,
				height: TILESIZE,
				colliderType: ECS.ColliderType.CUSTOM_SOLID,
			})
		);
	}

	static createDash(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity().addComponents(
			new Collectible(),
			new ECS.Position(pos.x, pos.y),
			new Sprite({ width: TILESIZE, height: TILESIZE, color: "purple" }),
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
			new Sprite({ width: TILESIZE, height: TILESIZE, image: SPIKE }),
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
