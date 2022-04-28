import { Vector } from "./vector";
import { AABB, Rectangle } from "./collision";

class QuadTree {
	private level: number;
	private nodes: QuadTree[];
	private objects: AABB[];
	private bounds: Rectangle;
	private max_objects: number;
	private max_levels: number;

	/**
	 *
	 * @param level
	 * @param bounds
	 * @param max_objects
	 * @param max_levels
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
	 *
	 * @param aabb
	 * @returns
	 */
	insert(aabb: AABB) {
		if (this.nodes.length) {
			let index = this.getIndex(aabb);
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
				let index = this.getIndex(object);
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
	 * split into 4 children
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
	 * TODO: make sure this function is accurate
	 * @param aabb
	 * @returns
	 */
	private getIndex(aabb: AABB): number {
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
	 *
	 * @param aabb
	 * @returns
	 */
	retrieve(aabb: AABB): AABB[] {
		let list: AABB[] = [...this.objects];

		const index = this.getIndex(aabb);
		if (this.nodes.length) {
			if (index != -1) {
				list = [...list, ...this.nodes[index].retrieve(aabb)];
			} else {
				list = [...this.all_objects()];
				//console.log("get all", list.length)
			}
		}

		//console.log(`retrieve id ${aabb.id}, level ${this.level}, index ${index}, ${list.length} possible`);

		return list;
	}

	all_objects(): AABB[] {
		let list: AABB[] = [...this.objects];

		for (let node of this.nodes) {
			list = [...list, ...node.all_objects()];
		}

		return list;
	}

	/**
	 *
	 * @param context
	 * @param color
	 */
	debug_draw(context: CanvasRenderingContext2D, color: string = "red") {
		context.strokeStyle = color;
		context.strokeRect(this.bounds.pos.x, this.bounds.pos.y, this.bounds.size.x, this.bounds.size.y);

		for (const node of this.nodes) {
			node.debug_draw(context, color);
		}
	}
}

export { QuadTree };
