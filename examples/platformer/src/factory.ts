
import * as ECS from "../../../src";
import { Sprite, Respawn, Health, Gravity, Bouncy, Spike, Collectible, Controller, Tile, Forces, ParticleEmitter } from "./components";

const TILESIZE = 8;

export class Factory {
	static createPlayer(pos: ECS.Vector): ECS.Entity {
		let size = new ECS.Vector(8, 8);
		return new ECS.Entity().addComponents(
			new Sprite(size.x, size.y, "red"),
			new Gravity(),
			new Forces(0,0),
			new ParticleEmitter(),
			new Controller(),
			new Health(),
			new ECS.Player(),
			new ECS.Input(),
			new ECS.Position(pos.x, pos.y),
			new Respawn(pos.x, pos.y),
			new ECS.Velocity(0, 0),
			new ECS.Collider(size.x, size.y)
		);
	}

	static createTile(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity().addComponents(
			new Tile(),
			new ECS.Position(pos.x, pos.y),
			new Sprite(TILESIZE, TILESIZE, "green"),
			new ECS.Collider(TILESIZE, TILESIZE, ECS.ColliderType.CUSTOM_SOLID)
		);
	}

	static createDash(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity().addComponents(
			new Collectible(),
			new ECS.Position(pos.x, pos.y),
			new Sprite(TILESIZE, TILESIZE, "purple"),
			new ECS.Collider(TILESIZE, TILESIZE, ECS.ColliderType.CUSTOM)
		);
	}
	static createBounce(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity().addComponents(
			new Bouncy(),
			new ECS.Position(pos.x, pos.y),
			new Sprite(TILESIZE, TILESIZE, "turquoise"),
			new ECS.Collider(TILESIZE, TILESIZE, ECS.ColliderType.CUSTOM_SOLID)
		);
	}

	static createSpike(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity().addComponents(
			new Spike(),
			new ECS.Position(pos.x, pos.y),
			new Sprite(TILESIZE, TILESIZE, "blue"),
			new ECS.Collider(TILESIZE, TILESIZE, ECS.ColliderType.CUSTOM_SOLID)
		);


	}

	static createEntity(pos: ECS.Vector): ECS.Entity {
		return new ECS.Entity();
	}
}