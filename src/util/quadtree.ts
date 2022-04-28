import { Vector } from "./vector";
import { AABB, Rectangle } from "./collision";

class QuadTree {
	private nodes: QuadTree[];
	private objects: AABB[];
	private bounds: Rectangle;
	private level: number;
	private max_objects: number;
	private max_levels: number;

	constructor(level: number, bounds: Rectangle, max_objects = 3, max_levels = 3) {
		this.nodes = [];
		this.objects = [];
		this.bounds = bounds;
		this.level = level;
		this.max_objects = max_objects;
		this.max_levels = max_levels;
	}

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

	getIndex(aabb: AABB): number {
		let index = -1;

		let x = aabb.pos.x;
		let y = aabb.pos.y;
		let w = aabb.size.x;
		let h = aabb.size.y;

		let bx = this.bounds.pos.x;
		let by = this.bounds.pos.y;

		let bw = this.bounds.size.x / 2;
		let bh = this.bounds.size.y / 2;

		if (x + w <= bx + bw && x >= bx && y + h <= by + bh && y >= by) {
			// top left
			//console.log("top left")
			index = 0;
		} else if (x + w <= bx + bw && x >= bx && y > by + bh && y + h < by + 2 * bh) {
			// bottom left
			//console.log("bottom left")
			index = 3;
		} else if (x > bx + bw && x + w <= bx + 2 * bw && y >= by && y + h <= by + bh) {
			// top right
			//console.log("top right")
			index = 1;
		} else if (x > bx + bw && x + w <= bx + 2 * bw && y > by + bh && y + h <= by + 2 * bh) {
			// bottom right
			//console.log("bottom right")
			index = 2;
		} else {
			//console.log("none of the above")
		}
		return index;
	}

	retrieve(aabb: AABB): AABB[] {
		let list: AABB[] = [];

		let index = this.getIndex(aabb);
		if (index != -1 && this.nodes.length) {
			list = [...this.nodes[index].retrieve(aabb)];
		}

		list = [...list, ...this.objects];

		return list;
	}

	debug_draw(context: CanvasRenderingContext2D, color: string = "cyan") {
		context.strokeStyle = color;
		context.strokeRect(this.bounds.pos.x, this.bounds.pos.y, this.bounds.size.x, this.bounds.size.y);

		for (const node of this.nodes) {
			node.debug_draw(context);
		}
	}
}

export { QuadTree };
