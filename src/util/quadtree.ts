import { Vector } from "./vector";
import { AABB, Rectangle } from "./collision";

interface BroadPhase {
	insert(aabb: AABB): void;
	query(aabb: AABB): AABB[];
	all(): AABB[];
	clear(): void;
}

class QuadTree implements BroadPhase {
	private level: number;
	private nodes: QuadTree[];
	private objects: AABB[];
	private bounds: Rectangle;
	private max_objects: number;
	private max_levels: number;

	/**
	 * Create Quadtree
	 * @param level current level of quadtree
	 * @param bounds bounds of quadtree
	 * @param max_objects max number of objects per node
	 * @param max_levels max number of nested nodes
	 */
	constructor(level: number, bounds: Rectangle, max_objects = 3, max_levels = 3) {
		this.nodes = [];
		this.objects = [];
		this.bounds = bounds;
		this.level = level;
		this.max_objects = max_objects;
		this.max_levels = max_levels;
	}

	/**
	 * insert AABB into quadtree
	 * @param aabb
	 * @returns nothing
	 */
	insert(aabb: AABB): void {
		if (this.nodes.length) {
			let index = this.get_quadrant(aabb);
			if (index !== -1) {
				this.nodes[index].insert(aabb);
				return;
			}
		}

		this.objects.push(aabb);

		if (this.objects.length > this.max_objects && this.level < this.max_levels) {
			if (!this.nodes.length) {
				this.split();
			}

			let newObjects = [];

			for (let object of this.objects) {
				let index = this.get_quadrant(object);
				if (index != -1) {
					this.nodes[index].insert(object);
				} else {
					newObjects.push(object);
				}
			}

			this.objects = newObjects;
		}
	}

	/**
	 * clear recursivly
	 */
	clear() {
		this.objects = [];
		for (let node of this.nodes) {
			node.clear();
		}
		this.nodes = [];
	}

	/**
	 * split node into 4 children
	 */
	split() {
		let w = this.bounds.size.x / 2;
		let h = this.bounds.size.y / 2;
		let x = this.bounds.pos.x;
		let y = this.bounds.pos.y;

		// top left
		this.nodes[0] = new QuadTree(
			this.level + 1,
			new Rectangle(new Vector(x, y), new Vector(w, h)),
			this.max_objects,
			this.max_levels
		);

		// top right
		this.nodes[1] = new QuadTree(
			this.level + 1,
			new Rectangle(new Vector(x + w, y), new Vector(w, h)),
			this.max_objects,
			this.max_levels
		);

		// bottom right
		this.nodes[2] = new QuadTree(
			this.level + 1,
			new Rectangle(new Vector(x + w, y + h), new Vector(w, h)),
			this.max_objects,
			this.max_levels
		);

		// bottom left
		this.nodes[3] = new QuadTree(
			this.level + 1,
			new Rectangle(new Vector(x, y + h), new Vector(w, h)),
			this.max_objects,
			this.max_levels
		);
	}

	/**
	 * get quadrant of AABB
	 * @param aabb
	 * @returns 0 - 3 if in quadrant, -1 if on the edge
	 */
	private get_quadrant(aabb: AABB): number {
		let index = -1;

		let x = aabb.pos.x;
		let y = aabb.pos.y;
		let w = aabb.size.x;
		let h = aabb.size.y;

		let bx = this.bounds.pos.x;
		let by = this.bounds.pos.y;

		let bw = this.bounds.size.x / 2;
		let bh = this.bounds.size.y / 2;

		if (x >= bx && x + w < bx + bw && y >= by && y + h < by + bh) {
			// top left
			index = 0;
		} else if (x >= bx + bw && x + w < bx + 2 * bw && y >= by && y + h < by + bh) {
			// top right
			index = 1;
		} else if (x >= bx + bw && x + w < bx + 2 * bw && y >= by + bh && y + h < by + 2 * bh) {
			// bottom right
			index = 2;
		} else if (x >= bx && x + w < bx + bw && y >= by + bh && y + h < by + 2 * bh) {
			// bottom left
			index = 3;
		}

		return index;
	}

	/**
	 * Query possible collisions for AABB
	 * @param aabb
	 * @returns all possible collisions
	 */
	query(aabb: AABB): AABB[] {
		let list: AABB[] = [...this.objects];

		const index = this.get_quadrant(aabb);
		if (this.nodes.length) {
			if (index != -1) {
				list = [...list, ...this.nodes[index].query(aabb)];
			} else {
				list = [...this.all()];
			}
		}

		return list;
	}

	/**
	 * Get all objects
	 * @returns all objects contained in this and it's child nodes
	 */
	all(): AABB[] {
		let list: AABB[] = [...this.objects];

		for (let node of this.nodes) {
			list = [...list, ...node.all()];
		}

		return list;
	}

	/**
	 * Draw Quadtree for debug purposes
	 * @param context
	 * @param color
	 */
	debug_draw(context: CanvasRenderingContext2D, color: string = "red", x_offset: number = 0, y_offset: number = 0) {
		context.strokeStyle = color;
		context.strokeRect(
			this.bounds.pos.x + x_offset,
			this.bounds.pos.y + y_offset,
			this.bounds.size.x,
			this.bounds.size.y
		);

		for (const node of this.nodes) {
			node.debug_draw(context, color, x_offset, y_offset);
		}
	}
}

export { QuadTree };
