import { Entity } from "../entity";
import { AABB } from "./collision";

class SpatialHashGrid {
	private _gridsize: number;
	private _lastPos: Map<string, number[]>;
	private _grid: Map<string, Entity[]>;

	constructor(gridsize: number) {
		this._grid = new Map();
		this._lastPos = new Map();
		this._gridsize = gridsize;
	}

	hash(x: number, y: number): number[] {
		return [Math.floor(x / this._gridsize), Math.floor(y / this._gridsize)];
	}

	insert(aabb: AABB) {}
}

export { SpatialHashGrid };
