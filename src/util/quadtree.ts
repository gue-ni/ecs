import { Vector } from "./vector";
import { Rectangle } from "./collision";

const MAX_OBJECTS = 2;
const MAX_LEVELS = 5;

class QuadTree {
	private nodes: QuadTree[];
	private objects: Rectangle[];
	private bounds: Rectangle;
	level: number;

	constructor(level: number, bounds: Rectangle) {
		this.nodes = [];
		this.objects = [];
		this.bounds = bounds;
		this.level = level;
	}

	insert(aabb: Rectangle) {

    let test = this.getIndex(aabb);
    //console.log(`test index ${test}`)


		if (this.nodes.length > 0) {
			let index = this.getIndex(aabb);
      //console.log(`index ${index}`)
			if (index !== -1) {
        //console.log(`insert at level ${this.level} into index ${index}`)
				this.nodes[index].insert(aabb);
				return;
			}
		}

    //console.log(`insert at level ${this.level}`)
		this.objects.push(aabb);

		if (this.objects.length >= MAX_OBJECTS && this.level < MAX_LEVELS) {
			if (this.nodes.length == 0) {
				this.split();
			}

			let oldObject = [...this.objects];
			this.objects = [];

			for (let object of oldObject) {
        let index = this.getIndex(object);
        if (index != -1){
          this.nodes[index].insert(object)
        } else {
          this.objects.push(object)
        }
			}
		}
	}

	/**
	 * clear recursivly
	 */
	clear() {
    //console.log("clear")
		this.objects = [];
		for (let node of this.nodes) {
			node.clear();
		}
    this.nodes = []
	}

	/**
	 * split into 4 children
	 */
	split() {
		console.log("splitting", this.level);

		let w = this.bounds.size.x / 2;
		let h = this.bounds.size.y / 2;
		let x = this.bounds.pos.x;
		let y = this.bounds.pos.y;

		// top left
		this.nodes[0] = new QuadTree(this.level + 1, new Rectangle(new Vector(x, y), new Vector(w, h)));
		// top right
		this.nodes[1] = new QuadTree(this.level + 1, new Rectangle(new Vector(x + w, y), new Vector(w, h)));
		// bottom left
		this.nodes[2] = new QuadTree(this.level + 1, new Rectangle(new Vector(x + w, y + h), new Vector(w, h)));
		// bottom right
		this.nodes[3] = new QuadTree(this.level + 1, new Rectangle(new Vector(x, y + h), new Vector(w, h)));
	}

	getIndex(aabb: Rectangle): number {
		let index = -1;

		let x = aabb.pos.x;
		let y = aabb.pos.y;
		let w = aabb.size.x;
		let h = aabb.size.y;

		let bx = this.bounds.pos.x;
		let by = this.bounds.pos.y;

		let bw = this.bounds.size.x / 2;
		let bh = this.bounds.size.y / 2;

		if (x + w <= bx + bw && y + h <= by + bh) {
			// top left
      //console.log("top left")
			index = 0;
		} else if (x + w <= bx + bw && y > by + bh) {
			// bottom left
      //console.log("bottom left")
			index = 2;
		} else if (x > bx + bw && y + h <= by + bh) {
			// top right
      //console.log("top right")
			index = 1;
		} else if (x > bx + bw && y > by + bh) {
			// bottom right
      //console.log("bottom right")
			index = 3;
		}

		return index;
	}

	retrieve(aabb: Rectangle): Rectangle[] {
		return [];
	}

	debug_draw(context: CanvasRenderingContext2D) {
    let colors = ["red", "blue", "green"]
		context.strokeStyle = colors[this.level];
		context.strokeRect(
			this.bounds.pos.x,
			this.bounds.pos.y,
			this.bounds.pos.x + this.bounds.size.x,
			this.bounds.pos.y + this.bounds.size.y
		);

		for (let node of this.nodes) {
			node.debug_draw(context);
		}
	}
}

export { QuadTree };
