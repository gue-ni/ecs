import { Component} from "../component";
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
		//quadtree.debug_draw(params.context, "#A0A0A0");
	}

	updateEntity(entity: Entity, params: UpdateParams): void {
		const velocity = entity.getComponent(Velocity) as Velocity;
		if (!velocity) return;

		const position = entity.getComponent(Position) as Position;
		const collider = entity.getComponent(Collider) as Collider;

		const possible = this.quadtree.query(collider.aabb);

		const collisions = [];

		collider.south = false;
		collider.east = false;
		collider.west = false;

		for (let i = 0; i < possible.length; i++) {
			const target = possible[i];
			if (target.id == entity.id) continue;

			const collision = DynamicRectVsRect(collider.aabb, target, params.dt);
			if (collision) {
				if (collision.contact_normal.y == -1) collider.south = true;
				if (collision.contact_normal.y == 1) collider.north = true;
				if (collision.contact_normal.x == -1) collider.east = true;
				if (collision.contact_normal.x == 1) collider.west = true;
				collisions.push({ i, time: collision.time });
			}
		}

		collisions.sort((a, b) => {
			return a.time - b.time;
		});

		const _DEBUG = true;

		if (_DEBUG) {
			const a = new Vector(
				collider.aabb.pos.x + collider.aabb.size.x / 2,
				collider.aabb.pos.y + collider.aabb.size.y / 2
			);
			const b = new Vector(a.x + collider.aabb.vel.x, a.y + collider.aabb.vel.y);
			/*
			params.context.strokeStyle = "white";
			params.context.beginPath();
			params.context.moveTo(a.x, a.y);
			params.context.lineTo(b.x, b.y);
			params.context.stroke();
      */
		}

		for (let { i } of collisions) {
			const target = possible[i];
			const collision = DynamicRectVsRect(collider.aabb, possible[i], params.dt);

			if (collision) {
				velocity.x += collision.contact_normal.x * Math.abs(velocity.x) * (1 - collision.time);
				velocity.y += collision.contact_normal.y * Math.abs(velocity.y) * (1 - collision.time);
				collider.aabb.vel.set(velocity.x, velocity.y);

				/*
				if (_DEBUG) {
					params.context.strokeStyle = "white";
					params.context.strokeRect(
						target.pos.x - collider.aabb.size.x / 2,
						target.pos.y - collider.aabb.size.y / 2,
						target.size.x + collider.aabb.size.x,
						target.size.y + collider.aabb.size.y
					);

					params.context.fillStyle = "blue";
					params.context.fillRect(contact_point.x - 2, contact_point.y - 2, 4, 4);
					params.context.fillStyle = "purple";
					params.context.fillRect(exit_point.x - 2, exit_point.y - 2, 4, 4);
				}
				*/
			}
		}
	}
}

export { Collider, CollisionSystem };
