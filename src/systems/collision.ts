import { Component } from "../component";
import { System } from "../system";
import { AABB, ColliderType, CollisionEvent, DynamicRectVsRect } from "../util/collision";
import { Vector } from "../util/vector";
import { Entity } from "../entity";
import { UpdateParams } from "../ecs";
import { Position, Velocity } from "./basic";
import { QuadTree } from "../util/quadtree";

class Collider extends Component {
	aabb: AABB;

	offset: Vector;

	north: boolean = false;
	south: boolean = false;
	east: boolean = false;
	west: boolean = false;

	constructor(
		width: number,
		height: number,
		colliderType: ColliderType = ColliderType.SOLID,
		offset: Vector = new Vector()
	) {
		super();
		this.aabb = new AABB(null, new Vector(), new Vector(width, height), new Vector(), colliderType);
		this.offset = offset;
	}
}

class CollisionSystem extends System {
	quadtree: QuadTree;
	constructor(quadtree: QuadTree) {
		super([Collider, Position]);
		this.quadtree = quadtree;
	}

	beforeAll(entities: Entity[], params: UpdateParams): void {
		this.quadtree.clear();

		for (const entity of entities) {
			const position = entity.getComponent(Position) as Position;
			const velocity = entity.getComponent(Velocity) as Velocity;
			const collider = entity.getComponent(Collider) as Collider;

			collider.aabb.entity = entity;
			collider.aabb.pos.set(position.x + collider.offset.x, position.y + collider.offset.y);
			if (velocity) {
				collider.aabb.vel.set(velocity.x, velocity.y);
			} else {
				collider.aabb.vel.set(0, 0);
			}

			this.quadtree.insert(collider.aabb);
		}
		if (params.context) {
			//this.quadtree.debug_draw(params.context, "#A0A0A0");
		}
	}

	updateEntity(entity: Entity, params: UpdateParams): void {
		const velocity = entity.getComponent(Velocity) as Velocity;
		if (!velocity) return;

		const context = params.context!;
		const collider = entity.getComponent(Collider) as Collider;

		/*
		TODO: fix bug
		 collisons must be checked in new position, not in old 
		*/
		//const possible = this.quadtree.query(collider.aabb);
		const possible = this.quadtree.all();

		const collisions = [];

		for (let i = 0; i < possible.length; i++) {
			if (possible[i].entity === entity) continue;

			const collision = DynamicRectVsRect(collider.aabb, possible[i], params.dt);
			if (collision) {
				collisions.push({ i, time: collision.time });
			}
		}

		collisions.sort((a, b) => {
			return a.time - b.time;
		});

		collider.south = collider.east = collider.west = collider.north = false;

		for (let { i } of collisions) {
			const collision = DynamicRectVsRect(collider.aabb, possible[i], params.dt);

			if (collision) {
				switch (possible[i].type) {
					case ColliderType.SOLID: {
						this.resolveCollision(collision, velocity, collider);
						break;
					}

					case ColliderType.CUSTOM_SOLID: {
						this.resolveCollision(collision, velocity, collider);
					}

					case ColliderType.CUSTOM: {
						if (possible[i].entity) this.customCollisionResponse(collision, entity, possible[i].entity!);
						break;
					}

					default: {
						throw new Error("not implemented");
					}
				}
			}
		}
	}

	resolveCollision(collision: CollisionEvent, velocity: Velocity, collider: Collider) {
		if (collision.contact_normal.y < 0) collider.south = true;
		if (collision.contact_normal.y > 0) collider.north = true;
		if (collision.contact_normal.x < 0) collider.east = true;
		if (collision.contact_normal.x > 0) collider.west = true;

		velocity.x += collision.contact_normal.x * Math.abs(velocity.x) * (1 - collision.time);
		velocity.y += collision.contact_normal.y * Math.abs(velocity.y) * (1 - collision.time);
		collider.aabb.vel.set(velocity.x, velocity.y);
	}

	customCollisionResponse(collision: CollisionEvent, entity: Entity, target: Entity) {}
}

export { Collider, CollisionSystem };
