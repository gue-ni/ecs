import * as ECS from "../../lib";

/**
 *       _
 *	  a	 |
 *       |  b
 * | --- X --- |
 *    d  |
 *       |c
 *       _
 */
export class BoundingBox extends ECS.Component {
	active: boolean;
	centerX: number;
	centerY: number;

	a: number;
	b: number;
	c: number;
	d: number;
	padding: number;

	bottomCollision: boolean;
	leftCollision: boolean;
	rightCollision: boolean;
	topCollision: boolean;

	constructor(a: number, b: number, c: number, d: number, base: number = 0, active: boolean = false) {
		super();
		this.active = active;
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.padding = base;
		this.bottomCollision = false;
		this.topCollision = false;
		this.rightCollision = false;
		this.leftCollision = false;
	}

	set_center(x: number, y: number): void {
		this.centerX = x;
		this.centerY = y;
	}

	get minX() {
		return this.centerX - this.d;
	}

	get maxX() {
		return this.centerX + this.b;
	}

	get minY() {
		return this.centerY - this.a - this.padding;
	}
	get maxY() {
		return this.centerY + this.c + this.padding;
	}
}

export class DetectionRange extends BoundingBox {
	constructor(range: number){
		super(range, range, range, range)
	}
}

export class SpatialHashGrid {
	_grid: Map<string, ECS.Entity[]>;
	_lastPos: Map<string, number[]>;
	_gridsize: number;

	constructor(gridsize: number) {
		this._grid = new Map();
		this._lastPos = new Map();
		this._gridsize = gridsize;
	}

	hash(x: number, y: number): number[] {
		return [Math.floor(x / this._gridsize), Math.floor(y / this._gridsize)];
	}

	update(entity: ECS.Entity) {}

	remove(entity: ECS.Entity): void {
		if (!this._lastPos.has(entity.id)) return;

		let [minX, minY, maxX, maxY] = this._lastPos.get(entity.id);
		this._lastPos.delete(entity.id);

		for (let i = minX; i <= maxX; i++) {
			for (let j = minY; j <= maxY; j++) {
				const key = `${i}/${j}`;

				if (this._grid.has(key)) {
					let cell = this._grid.get(key);
					this._grid.set(
						key,
						cell.filter((item) => item != entity)
					);
				}
			}
		}
	}

	insert(entity: ECS.Entity): void {
		let box = entity.getComponent(BoundingBox) as BoundingBox;
		if (!box) new Error("Entity must have a bounding box");

		let [minX, minY] = this.hash(box.minX, box.minY);
		let [maxX, maxY] = this.hash(box.maxX, box.maxY);

		/*
		if (this._lastPos.has(entity.id)) {
			let [lastMinX, lastMinY, lastMaxX, lastMaxY] = this._lastPos.get(entity.id);
			if (minX == lastMinX && minY == lastMinY && maxX == lastMaxX && maxY == lastMaxY) {
				return;
			}
		}
		*/

		this._lastPos.set(entity.id, [minX, minY, maxX, maxY]);

		for (let i = minX; i <= maxX; i++) {
			for (let j = minY; j <= maxY; j++) {
				const key = `${i}/${j}`;

				if (this._grid.has(key)) {
					let list = this._grid.get(key);
					list.push(entity);
					this._grid.set(key, list);
				} else {
					this._grid.set(key, [entity]);
				}
			}
		}
	}

	possible_collisions(entity: ECS.Entity): ECS.Entity[] {
		let box = entity.getComponent(BoundingBox) as BoundingBox;
		if (!box) new Error("Entity must have a bounding box");

		let [minX, minY] = this.hash(box.minX, box.minY);
		let [maxX, maxY] = this.hash(box.maxX, box.maxY);

		let possible = new Set<ECS.Entity>();

		for (let i = minX; i <= maxX; i++) {
			for (let j = minY; j <= maxY; j++) {
				const key = `${i}/${j}`;

				if (this._grid.has(key)) {
					this._grid
						.get(key)
						.filter((item) => item != entity)
						.map((item) => possible.add(item));
				}
			}
		}

		return [...possible];
	}
}

