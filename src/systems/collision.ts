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

	constructor(params: { width: number; height: number; colliderType?: ColliderType; offset?: Vector }) {
		super();
		this.aabb = new AABB(
			null,
			new Vector(),
			new Vector(params.width, params.height),
			new Vector(),
			params.colliderType || ColliderType.SOLID
		);
		this.offset = params.offset ?? new Vector();
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
	}

	updateEntity(entity: Entity, params: UpdateParams): void {
		const velocity = entity.getComponent(Velocity) as Velocity;
		if (!velocity) return;

		const velocity_before_collision = new Vector(velocity.x, velocity.y);
		const collider = entity.getComponent(Collider) as Collider;

		/*
		TODO: fix bug
		 collisons must be checked in new position, not in old 
		*/
		//const possible = this.quadtree.query(collider.aabb);
		const colliders = this.quadtree.all();

		const collisions = [];

		// detect collisions
		for (let i = 0; i < colliders.length; i++) {
			if (colliders[i].entity === entity) continue;

			const collision = DynamicRectVsRect(collider.aabb, colliders[i], params.dt);
			if (collision) collisions.push({ i, time: collision.time });
		}

		collisions.sort((a, b) => a.time - b.time);

		collider.south = collider.east = collider.west = collider.north = false;

		// handle collisions
		for (let { i } of collisions) {
			const collision = DynamicRectVsRect(collider.aabb, colliders[i], params.dt);
			if (collision) {
				switch (colliders[i].type) {
					case ColliderType.BOUNCE: {
						this.solidResponse(collision, velocity, collider);
						break;
					}

					case ColliderType.SOLID: {
						this.solidResponse(collision, velocity, collider);
						break;
					}

					case ColliderType.SOLID_FROM_TOP: {
						if (collision.contact_normal.y < 0) {
							this.solidResponse(collision, velocity, collider);
						}
						break;
					}

					case ColliderType.CUSTOM_SOLID: {
						this.solidResponse(collision, velocity, collider);
						if (colliders[i].entity) this.onSolidCollision(collision, entity, colliders[i].entity!, params);
						break;
					}

					case ColliderType.CUSTOM: {
						if (colliders[i].entity)
							this.onTriggerCollision(collision, entity, colliders[i].entity!, params);
						break;
					}

					default: {
						throw new Error("not implemented");
					}
				}
			}
		}
	}

	solidResponse(collision: CollisionEvent, velocity: Velocity, collider: Collider) {
		if (collision.contact_normal.y < 0) collider.south = true;
		if (collision.contact_normal.y > 0) collider.north = true;
		if (collision.contact_normal.x < 0) collider.east = true;
		if (collision.contact_normal.x > 0) collider.west = true;

		velocity.x += collision.contact_normal.x * Math.abs(velocity.x) * (1 - collision.time);
		velocity.y += collision.contact_normal.y * Math.abs(velocity.y) * (1 - collision.time);
		collider.aabb.vel.set(velocity.x, velocity.y);
	}

	bouncyResponse(collision: CollisionEvent, velocity: Velocity, collider: Collider) {
		this.solidResponse(collision, velocity, collider);
	}

	onTriggerCollision(collision: CollisionEvent, entity: Entity, target: Entity, params: UpdateParams) {}

	onSolidCollision(collision: CollisionEvent, entity: Entity, target: Entity, params: UpdateParams) {}
}

export { Collider, CollisionSystem };
