import { Component } from "../component";
import { IVector, Vector } from "../util/vector";

class VectorComponent extends Component implements IVector {
	x: number;
	y: number;
	constructor(x: number, y: number) {
		super();
		this.x = x;
		this.y = y;
	}

	get vector() {
		return new Vector(this.x, this.y);
	}

	set(x: number, y: number){
		this.x = x;
		this.y = y;
	}
}

class Velocity extends VectorComponent {}

class Position extends VectorComponent {}

class Player extends Component {}

export { Position, Velocity, Player };
