import { Component } from "../component";
import { System } from "../system";
import { AABB, DynamicRectVsRect } from "../util/collision";
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
	constructor(width: number, height: number, offset: Vector = new Vector()) {
		super();
		this.aabb = new AABB("", new Vector(), new Vector(width, height));
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

			collider.aabb.id = entity.id;
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

		collider.south = collider.east = collider.west = collider.north = false;

		for (let i = 0; i < possible.length; i++) {
			if (possible[i].id == entity.id) continue;

			const collision = DynamicRectVsRect(collider.aabb, possible[i], params.dt);
			if (collision) {
				if (collision.contact_normal.y === -1) collider.south = true;
				if (collision.contact_normal.y === +1) collider.north = true;
				if (collision.contact_normal.x === -1) collider.east = true;
				if (collision.contact_normal.x === +1) collider.west = true;

				collisions.push({ i, time: collision.time });
			}
		}

		collisions.sort((a, b) => {
			return a.time - b.time;
		});

		const _DEBUG = false;

		if (_DEBUG) {
			const a = new Vector(
				collider.aabb.pos.x + collider.aabb.size.x / 2,
				collider.aabb.pos.y + collider.aabb.size.y / 2
			);
			const b = new Vector(a.x + collider.aabb.vel.x, a.y + collider.aabb.vel.y);
			context.strokeStyle = "white";
			context.beginPath();
			context.moveTo(a.x, a.y);
			context.lineTo(b.x, b.y);
			context.stroke();
		}

		for (let { i } of collisions) {
			const collision = DynamicRectVsRect(collider.aabb, possible[i], params.dt);

			if (collision) {
				velocity.x += collision.contact_normal.x * Math.abs(velocity.x) * (1 - collision.time);
				velocity.y += collision.contact_normal.y * Math.abs(velocity.y) * (1 - collision.time);
				collider.aabb.vel.set(velocity.x, velocity.y);

				if (_DEBUG) {
					context.strokeStyle = "white";
					context.strokeRect(
						possible[i].pos.x - collider.aabb.size.x / 2,
						possible[i].pos.y - collider.aabb.size.y / 2,
						possible[i].size.x + collider.aabb.size.x,
						possible[i].size.y + collider.aabb.size.y
					);

					context.fillStyle = "blue";
					context.fillRect(collision.contact_point.x - 2, collision.contact_point.y - 2, 4, 4);

					/*
					context.fillStyle = "purple";
					context.fillRect(collision.exit_point.x - 2, collision.exit_point.y - 2, 4, 4);
					*/
				}
			}
		}
	}
}

export { Collider, CollisionSystem };
