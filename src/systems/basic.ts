import { Component } from "../component";
import { IVector } from "../util/vector";

class VectorComponent extends Component implements IVector {
	x: number;
	y: number;
	constructor(x: number, y: number) {
		super();
		this.x = x;
		this.y = y;
	}
}

class Velocity extends VectorComponent {}

class Position extends VectorComponent {}

export { Position, Velocity };
